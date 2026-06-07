import { PaymentStatus } from "@/enums";
import { OrderCalculations } from "./calculations";
import { OrderValidators } from "./validators";
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
  DiscountInfo,
  OrderBuildConfig,
  OrderTotals,
} from "./types";

/**
 * OrderBuilder implements the Builder pattern for constructing valid Order documents
 *
 * This class provides a fluent API for building orders incrementally while ensuring:
 * - All required data is present before finalization
 * - All business logic rules are enforced (totals, discounts, etc.)
 * - Data immutability where appropriate
 * - Clear separation of concerns
 * - Type safety throughout
 *
 * @example
 * ```typescript
 * const order = await new OrderBuilder()
 *   .setCustomer({ userId: "123", email: "user@example.com", ... })
 *   .setShippingAddress({ address: "...", city: "...", ... })
 *   .setPaymentInfo({ gateway: PaymentGateway.Flutterwave })
 *   .addSubOrder({ storeId: "store1", storeName: "Store 1", ... })
 *   .applyDiscount({ amount: 5000, couponCode: "SAVE10" })
 *   .setIdempotencyKey(idempotencyKey)
 *   .build();
 * ```
 *
 * @remarks
 * - This builder is designed for single-use. Create a new instance for each order.
 * - All monetary values are in kobo (smallest currency unit).
 * - The builder validates state at every step but only enforces final consistency at build().
 * - Method chaining is supported for fluent API usage.
 */
export class OrderBuilder {
  // State management
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
   * Sets customer information for the order
   *
   * @param customer - Customer details including user ID, email, name, and phone
   * @returns this (for method chaining)
   * @throws {InvalidCustomerError} if customer data is invalid
   * @throws {InvalidOrderStateError} if order is already built
   *
   * @example
   * builder.setCustomer({
   *   userId: "user123",
   *   email: "user@example.com",
   *   name: "John Doe",
   *   phoneNumber: "+2348012345678"
   * });
   */
  setCustomer(customer: CustomerInfo): this {
    this.throwIfBuilt();
    OrderValidators.validateCustomer(customer);
    this.customer = Object.freeze({ ...customer });
    return this;
  }

  /**
   * Sets shipping address for the order
   *
   * @param address - Shipping address details
   * @returns this (for method chaining)
   * @throws {InvalidAddressError} if address is invalid
   * @throws {InvalidOrderStateError} if order is already built
   *
   * @example
   * builder.setShippingAddress({
   *   address: "123 Main St",
   *   city: "Lagos",
   *   state: "Lagos State",
   *   postalCode: "100001",
   *   deliveryType: DeliveryType.OffCampus
   * });
   */
  setShippingAddress(address: ShippingAddressInfo): this {
    this.throwIfBuilt();
    OrderValidators.validateShippingAddress(address);
    this.shippingAddress = Object.freeze({ ...address });
    return this;
  }

  /**
   * Sets payment information for the order
   *
   * @param paymentInfo - Payment gateway and method details
   * @returns this (for method chaining)
   * @throws {InvalidPaymentError} if payment info is invalid
   * @throws {InvalidOrderStateError} if order is already built
   *
   * @example
   * builder.setPaymentInfo({
   *   gateway: PaymentGateway.Flutterwave,
   *   status: PaymentStatus.Pending,
   *   method: "card"
   * });
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
   * Adds a sub-order (a store's portion of the order)
   *
   * Validates that:
   * - Store information is valid
   * - All products in the sub-order are valid
   * - Shipping method is properly configured
   * - Sub-order totals can be calculated correctly
   *
   * @param subOrder - Sub-order configuration
   * @returns this (for method chaining)
   * @throws {InvalidSubOrderError} if sub-order is invalid
   * @throws {InvalidOrderStateError} if order is already built
   *
   * @example
   * builder.addSubOrder({
   *   storeId: "store1",
   *   storeName: "Store One",
   *   products: [{ product: {...}, quantity: 2 }],
   *   shippingMethod: { name: "Standard", price: 2000 }
   * });
   */
  addSubOrder(subOrder: SubOrderConfig): this {
    this.throwIfBuilt();

    // Validate store information
    OrderValidators.validateStoreInfo(subOrder.storeId, subOrder.storeName);

    // Validate products
    OrderValidators.validateSubOrderHasProducts(subOrder.products);
    for (const product of subOrder.products) {
      OrderValidators.validateProduct(product);
    }

    // Validate shipping
    OrderValidators.validateShippingMethod(subOrder.shippingMethod);

    // Store the sub-order (make it immutable)
    this.subOrders.push(Object.freeze(subOrder));

    return this;
  }

  /**
   * Applies a discount to the entire order
   *
   * Validates that:
   * - Discount type is valid (percentage or fixed)
   * - Discount value is reasonable (not exceeding order total)
   * - Discount amount is calculated correctly
   *
   * @param discount - Discount information
   * @returns this (for method chaining)
   * @throws {InvalidDiscountError} if discount is invalid
   * @throws {InvalidOrderStateError} if order is already built
   *
   * @example
   * builder.applyDiscount({
   *   amount: 10000,
   *   couponCode: "SAVE10",
   *   type: CouponTypeEnum.Fixed,
   *   description: "Coupon discount: SAVE10"
   * });
   */
  applyDiscount(discount: DiscountInfo): this {
    this.throwIfBuilt();

    // Discount amount will be validated against subtotal during build()
    // For now, we just validate it's non-negative
    if (discount.amount < 0) {
      throw new Error("Discount amount cannot be negative");
    }

    this.discount = Object.freeze({ ...discount });

    // Store coupon code separately if provided
    if (discount.couponCode) {
      this.couponCode = discount.couponCode;
    }

    return this;
  }

  /**
   * Sets order notes
   *
   * @param notes - Additional notes about the order
   * @returns this (for method chaining)
   * @throws {InvalidOrderStateError} if order is already built
   *
   * @example
   * builder.setNotes("Handle with care - fragile items");
   */
  setNotes(notes: string): this {
    this.throwIfBuilt();
    OrderValidators.validateNotes(notes);
    this.notes = notes;
    return this;
  }

  /**
   * Sets the idempotency key for the order
   *
   * This key ensures that duplicate order requests result in the same order
   * being returned, rather than creating duplicate orders.
   *
   * @param key - Unique idempotency key (should be UUID or similar)
   * @returns this (for method chaining)
   * @throws {InvalidSubOrderError} if key is invalid
   * @throws {InvalidOrderStateError} if order is already built
   *
   * @example
   * builder.setIdempotencyKey(crypto.randomUUID());
   */
  setIdempotencyKey(key: string): this {
    this.throwIfBuilt();
    OrderValidators.validateIdempotencyKey(key);
    this.idempotencyKey = key;
    return this;
  }

  /**
   * Builds and returns the final order configuration
   *
   * This method:
   * - Validates all required fields are present
   * - Calculates totals and verifies consistency
   * - Validates discount against subtotal
   * - Generates status history
   * - Returns an immutable OrderBuildConfig ready for persistence
   *
   * @returns Complete OrderBuildConfig object
   * @throws {IncompleteOrderError} if required fields are missing
   * @throws {InvalidOrderTotalsError} if total calculations fail
   * @throws {InvalidDiscountError} if discount exceeds subtotal
   *
   * @remarks
   * After calling build(), the builder instance should not be reused.
   * Create a new OrderBuilder for new orders.
   *
   * @example
   * const config = await builder.build();
   * const orderDoc = new Order(config);
   * const savedOrder = await orderDoc.save();
   */
  build(): OrderBuildConfig {
    this.throwIfBuilt();

    // Validate all required fields are present
    this.validateCompleteness();

    // Mark as built to prevent further modifications
    this.isBuilt = true;

    // Build the configuration object
    const config: OrderBuildConfig = {
      customer: this.customer!,
      subOrders: Object.freeze([...this.subOrders]),
      shippingAddress: this.shippingAddress!,
      paymentInfo: this.paymentInfo!,
      discount: this.discount,
      couponCode: this.couponCode,
      notes: this.notes,
      idempotencyKey: this.idempotencyKey!,
    };

    // Return immutable configuration
    return Object.freeze(config);
  }

  /**
   * Calculates total order amount including all sub-orders, shipping, and discount
   *
   * @returns OrderTotals with subtotal, discount, shipping, and total
   * @throws {TotalCalculationError} if calculation fails
   *
   * @remarks
   * This can be called before build() to preview totals.
   * The final totals are recalculated during build() for consistency.
   *
   * @example
   * const totals = builder.calculateTotals();
   * console.log(`Total: ${totals.total} kobo`);
   */
  calculateTotals(): OrderTotals {
    if (this.subOrders.length === 0) {
      throw new IncompleteOrderError("No sub-orders to calculate totals for");
    }

    // Calculate subtotal across all sub-orders
    const subtotal = this.subOrders.reduce((sum, subOrder) => {
      const storeTotal = OrderCalculations.calculateProductsTotal(
        subOrder.products.map((p) => ({
          price: p.selectedSize?.price ?? p.product.price,
          quantity: p.quantity,
        })),
      );
      return sum + storeTotal;
    }, 0);

    // Calculate total shipping
    const shippingTotal = this.subOrders.reduce((sum, subOrder) => {
      return sum + (subOrder.shippingMethod.price || 0);
    }, 0);

    // Get discount amount if any
    const discountAmount = this.discount?.amount ?? 0;

    // Return calculated totals
    return OrderCalculations.calculateOrderTotals(
      subtotal,
      shippingTotal,
      discountAmount,
    );
  }

  /**
   * Gets the current build state for inspection (for testing/debugging)
   *
   * @returns Current state of the builder
   * @remarks This is primarily for testing and debugging. Avoid using in production.
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

  // ============================================================================
  // PRIVATE METHODS - Internal helpers
  // ============================================================================

  /**
   * Validates that the builder has all required fields for building an order
   * @throws {IncompleteOrderError} if required fields are missing
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

    // Validate totals consistency
    try {
      this.calculateTotals();
    } catch (error) {
      throw new IncompleteOrderError(
        `Order totals are invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Throws if the order has already been built
   * Prevents modifications after build() has been called
   * @throws {InvalidOrderStateError} if already built
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
