/**
 * OrderBuilder
 *
 * Implements the Builder pattern for constructing valid, financially-complete
 * Order documents.
 *
 * Financial responsibility model (after refactor):
 * ─────────────────────────────────────────────────
 * OrderBuilder is an ORCHESTRATOR, not a calculator.
 *
 * It is responsible for:
 *   • Collecting and validating inputs (customer, address, payment, sub-orders,
 *     discount, idempotency key).
 *   • Splitting a coupon discount proportionally across sub-orders via
 *     DiscountCalculator (one call, no custom math).
 *   • Calling buildSubOrderFinancials() once per sub-order to produce the
 *     immutable financial snapshot.
 *   • Combining the validated SubOrderConfig with its snapshot into a
 *     SubOrderBuildResult, which is what the rest of the system consumes.
 *
 * It is NOT responsible for:
 *   • Knowing commission percentages or flat-fee thresholds.
 *   • Knowing how to calculate percentage vs. fixed discounts.
 *   • Any monetary arithmetic beyond calling the dedicated utilities.
 *
 * Changes from the previous version:
 * ─────────────────────────────────────────────────
 *   • build() now calls buildSubOrderFinancials() for each sub-order and
 *     embeds the result as SubOrderBuildResult in OrderBuildConfig.subOrders.
 *   • calculateTotals() is preserved for previewing the order-level grand
 *     total (used by the UI and by validateCompleteness).
 *   • No commission or discount arithmetic lives in this file.
 */

import { PaymentStatus } from "@/enums";
import { OrderCalculations } from "./calculations";
import { DiscountCalculator } from "@/lib/utils/discount-calculator";
import { OrderValidators } from "./validators";
import { buildSubOrderFinancials } from "./build-sub-order-financials";
import {
  IncompleteOrderError,
  InvalidOrderStateError,
  InvalidPaymentError,
} from "./errors";
import type {
  CustomerInfo,
  ShippingAddressInfo,
  PaymentInfo,
  SubOrderConfig,
  SubOrderBuildResult,
  DiscountInfo,
  OrderBuildConfig,
  OrderTotals,
} from "./types";

export class OrderBuilder {
  private customer?: CustomerInfo;
  private shippingAddress?: ShippingAddressInfo;
  private paymentInfo?: PaymentInfo;
  private subOrders: SubOrderConfig[] = [];
  private discount?: DiscountInfo;
  private couponCode?: string;
  private notes?: string;
  private idempotencyKey?: string;
  private isBuilt = false;

  /**
   * Sets customer information for the order.
   *
   * @throws {InvalidCustomerError} if customer data is invalid.
   * @throws {InvalidOrderStateError} if the order has already been built.
   */
  setCustomer(customer: CustomerInfo): this {
    this.throwIfBuilt();
    OrderValidators.validateCustomer(customer);
    this.customer = Object.freeze({ ...customer });
    return this;
  }

  /**
   * Sets the shipping address for the order.
   *
   * @throws {InvalidAddressError} if the address is invalid.
   * @throws {InvalidOrderStateError} if the order has already been built.
   */
  setShippingAddress(address: ShippingAddressInfo): this {
    this.throwIfBuilt();
    OrderValidators.validateShippingAddress(address);
    this.shippingAddress = Object.freeze({ ...address });
    return this;
  }

  /**
   * Sets payment information for the order.
   *
   * @throws {InvalidPaymentError} if payment info is missing or invalid.
   * @throws {InvalidOrderStateError} if the order has already been built.
   */
  setPaymentInfo(paymentInfo: PaymentInfo): this {
    this.throwIfBuilt();

    if (!paymentInfo || !paymentInfo.gateway) {
      throw new InvalidPaymentError("Payment gateway is required");
    }

    this.paymentInfo = Object.freeze({
      gateway: paymentInfo.gateway,
      status: paymentInfo.status ?? PaymentStatus.Pending,
      method: paymentInfo.method,
    });
    return this;
  }

  /**
   * Adds a sub-order (a store's portion of the overall order).
   *
   * Validates store info, all products, and the shipping method.
   * Financial computation is deferred to build().
   *
   * @throws {InvalidSubOrderError} if the sub-order is invalid.
   * @throws {InvalidOrderStateError} if the order has already been built.
   */
  addSubOrder(subOrder: SubOrderConfig): this {
    this.throwIfBuilt();

    OrderValidators.validateStoreInfo(subOrder.storeId, subOrder.storeName);
    OrderValidators.validateSubOrderHasProducts(subOrder.products);
    for (const product of subOrder.products) {
      OrderValidators.validateProduct(product);
    }
    OrderValidators.validateShippingMethod(subOrder.shippingMethod);

    this.subOrders.push(Object.freeze(subOrder));
    return this;
  }

  /**
   * Applies a discount to the order.
   *
   * The amount must be non-negative. Validation against the order subtotal
   * is deferred to build() once all sub-orders are known.
   *
   * @throws {Error} if the discount amount is negative.
   * @throws {InvalidOrderStateError} if the order has already been built.
   */
  applyDiscount(discount: DiscountInfo): this {
    this.throwIfBuilt();

    if (discount.amount < 0) {
      throw new Error("Discount amount cannot be negative");
    }

    this.discount = Object.freeze({ ...discount });

    if (discount.couponCode) {
      this.couponCode = discount.couponCode;
    }

    return this;
  }

  /**
   * Sets optional order notes.
   *
   * @throws {InvalidSubOrderError} if notes exceed 1,000 characters.
   * @throws {InvalidOrderStateError} if the order has already been built.
   */
  setNotes(notes: string): this {
    this.throwIfBuilt();
    OrderValidators.validateNotes(notes);
    this.notes = notes;
    return this;
  }

  /**
   * Sets the idempotency key for the order.
   *
   * @throws {InvalidSubOrderError} if the key is empty or too long.
   * @throws {InvalidOrderStateError} if the order has already been built.
   */
  setIdempotencyKey(key: string): this {
    this.throwIfBuilt();
    OrderValidators.validateIdempotencyKey(key);
    this.idempotencyKey = key;
    return this;
  }

  /**
   * Finalises and returns the complete, financially-enriched OrderBuildConfig.
   *
   * Steps performed:
   *   1. Validate completeness (all required fields present, totals coherent).
   *   2. Compute per-sub-order subtotals for proportional discount splitting.
   *   3. Split the order-level discount proportionally across sub-orders
   *      (via DiscountCalculator — no custom math here).
   *   4. Call buildSubOrderFinancials() for each sub-order to produce an
   *      immutable ISubOrderFinancials snapshot.
   *   5. Pair each SubOrderConfig with its snapshot as a SubOrderBuildResult.
   *   6. Return an immutable OrderBuildConfig.
   *
   * @returns Complete OrderBuildConfig ready for persistence.
   * @throws {IncompleteOrderError} if required fields are missing or totals fail.
   */
  build(): OrderBuildConfig {
    this.throwIfBuilt();
    this.validateCompleteness();
    this.isBuilt = true;

    // ── Step 1: Compute per-sub-order subtotals ───────────────────────────
    // These raw subtotals are used only for proportional discount distribution.
    // They are NOT the final financial figures (those come from
    // buildSubOrderFinancials).
    const subOrderSubtotals = this.subOrders.map((subOrder) =>
      OrderCalculations.calculateProductsTotal(
        subOrder.products.map((p) => ({
          price: p.selectedSize?.price ?? p.product.price,
          quantity: p.quantity,
        })),
      ),
    );

    // ── Step 2: Distribute discount proportionally across sub-orders ──────
    // DiscountCalculator owns this logic. OrderBuilder just passes the numbers.
    let discountDistribution: number[] = this.subOrders.map(() => 0);

    if (this.discount && this.discount.amount > 0) {
      const { distribution } =
        DiscountCalculator.distributeDiscountProportionally(
          this.discount.amount,
          subOrderSubtotals,
        );
      discountDistribution = distribution;
    }

    // ── Step 3: Build financial snapshot for each sub-order ───────────────
    // buildSubOrderFinancials() is the only place commission and settlement
    // amounts are computed. OrderBuilder does not touch those numbers.
    const enrichedSubOrders: SubOrderBuildResult[] = this.subOrders.map(
      (subOrder, index) => {
        const allocatedDiscount = discountDistribution[index] ?? 0;

        // Only attach a discount object when an actual amount was allocated,
        // so ISubOrderFinancials.discount remains absent for sub-orders that
        // received ₦0 (e.g. due to rounding in a very skewed distribution).
        const subOrderDiscount: DiscountInfo | undefined =
          allocatedDiscount > 0 && this.discount
            ? {
                ...this.discount,
                // Override the amount with this sub-order's allocated slice.
                amount: allocatedDiscount,
              }
            : undefined;

        const financials = buildSubOrderFinancials({
          items: subOrder.products,
          discount: subOrderDiscount,
        });

        return Object.freeze({
          config: subOrder,
          financials,
        } satisfies SubOrderBuildResult);
      },
    );

    // ── Step 4: Assemble and return the final config ───────────────────────
    const config: OrderBuildConfig = {
      customer: this.customer!,
      subOrders: Object.freeze(enrichedSubOrders),
      shippingAddress: this.shippingAddress!,
      paymentInfo: this.paymentInfo!,
      discount: this.discount,
      couponCode: this.couponCode,
      notes: this.notes,
      idempotencyKey: this.idempotencyKey!,
    };

    return Object.freeze(config);
  }

  /**
   * Calculates the order-level grand total across all sub-orders.
   *
   * Used internally by validateCompleteness() and can be called externally
   * to preview totals before build().
   *
   * @returns OrderTotals with subtotal, discount, shipping, and total.
   * @throws {IncompleteOrderError} if no sub-orders have been added yet.
   */
  calculateTotals(): OrderTotals {
    if (this.subOrders.length === 0) {
      throw new IncompleteOrderError("No sub-orders to calculate totals for");
    }

    const subtotal = this.subOrders.reduce((sum, subOrder) => {
      return (
        sum +
        OrderCalculations.calculateProductsTotal(
          subOrder.products.map((p) => ({
            price: p.selectedSize?.price ?? p.product.price,
            quantity: p.quantity,
          })),
        )
      );
    }, 0);

    const shippingTotal = this.subOrders.reduce((sum, subOrder) => {
      return sum + (subOrder.shippingMethod.price || 0);
    }, 0);

    const discountAmount = this.discount?.amount ?? 0;

    return OrderCalculations.calculateOrderTotals(
      subtotal,
      shippingTotal,
      discountAmount,
    );
  }

  /**
   * Returns the current internal state for testing/debugging purposes.
   * Do not use in production logic.
   * @internal
   */
  getState() {
    return {
      customer: this.customer,
      shippingAddress: this.shippingAddress,
      paymentInfo: this.paymentInfo,
      subOrderCount: this.subOrders.length,
      hasDiscount: !!this.discount,
      hasNotes: !!this.notes,
      hasIdempotencyKey: !!this.idempotencyKey,
      isBuilt: this.isBuilt,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Asserts that all required fields are present and totals are coherent.
   *
   * @throws {IncompleteOrderError}
   * @private
   */
  private validateCompleteness(): void {
    const missing: string[] = [];

    if (!this.customer) missing.push("customer");
    if (!this.shippingAddress) missing.push("shipping address");
    if (!this.paymentInfo) missing.push("payment information");
    if (this.subOrders.length === 0)
      missing.push("sub-orders (at least one required)");
    if (!this.idempotencyKey) missing.push("idempotency key");

    if (missing.length > 0) {
      throw new IncompleteOrderError(
        `Cannot build order. Missing required fields: ${missing.join(", ")}`,
      );
    }

    // Validate totals coherence — catches discount > subtotal, negative totals, etc.
    try {
      this.calculateTotals();
    } catch (error) {
      throw new IncompleteOrderError(
        `Order totals are invalid: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Prevents further modification after build() has been called.
   *
   * @throws {InvalidOrderStateError}
   * @private
   */
  private throwIfBuilt(): void {
    if (this.isBuilt) {
      throw new InvalidOrderStateError(
        "Order has already been built. Create a new OrderBuilder instance.",
      );
    }
  }
}
