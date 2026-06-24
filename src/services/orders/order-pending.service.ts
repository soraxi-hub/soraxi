import mongoose from "mongoose";
import { getOrderModel, IOrder } from "@/lib/db/models/order.model";
import { OrderBuilder, OrderRepository } from "@/domain/orders";
import { PaymentStatus, PaymentGateway, CouponTypeEnum } from "@/enums";
import { DiscountCalculator } from "@/lib/utils/discount-calculator";
import { CouponService } from "../coupon.service";
import { currencyOperations } from "@/lib/utils/naira";
import { PublicToJSONUserType } from "@/domain/users/user-interface";
import {
  CartItemsWithShippingMethod,
  PreparedPaymentData,
} from "../checkout.service";
import { Cart } from "@/domain/cart/cart";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { DateFormatter } from "@/lib/utils/date-formatter";

type CreatePendingOrderParams = {
  user: PublicToJSONUserType;
  cart: Cart;
  input: PreparedPaymentData;
};

/**
 * OrderPendingService handles creation of pending orders using the OrderBuilder pattern.
 *
 * Responsibility after the financial-composition refactor:
 * ─────────────────────────────────────────────────────────
 * This service is a pure orchestrator. Its only financial concern is
 * validating the coupon and computing the order-level totalDiscount so it
 * can be handed to OrderBuilder.applyDiscount().
 *
 * It does NOT:
 *   - Distribute discounts across stores (OrderBuilder.build() does that via
 *     DiscountCalculator.distributeDiscountProportionally).
 *   - Compute commissions or settlement amounts (buildSubOrderFinancials does
 *     that via calculateCommission).
 *   - Touch any per-sub-order financials.
 *
 * Flow:
 *   PreparedPaymentData
 *     → coupon validation + totalDiscount  (calculateDiscount)
 *     → OrderBuilder fluent construction
 *     → OrderBuilder.build()              (discount split + financials computed)
 *     → OrderRepository.createOrder()     (persistence)
 */
export class OrderPendingService {
  /**
   * Creates a pending order with PaymentStatus = Pending.
   *
   * @param params - User, cart, and prepared payment data
   * @returns The saved order document
   * @throws Error if the idempotency key is missing or a duplicate order exists
   * @throws DuplicateOrderError from OrderRepository if the key races past the pre-check
   * @throws Any domain or DB error propagated from OrderBuilder / OrderRepository
   *
   * @remarks
   * CRITICAL — do not rename or restructure the fields extracted from `input`.
   * They are verified by the Flutterwave webhook handler; any change here must
   * be mirrored there.
   */
  static async createPendingOrder({
    user,
    cart,
    input,
  }: CreatePendingOrderParams) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const OrderModel = await getOrderModel();
      const idempotencyKey = cart.idempotencyKey;
      if (!idempotencyKey) throw new Error("IdempotencyKey required");

      // ── Duplicate guard ────────────────────────────────────────────────
      // A second check is performed inside OrderRepository.createOrder()
      // within the transaction, but this early check avoids building the
      // entire order only to throw at persistence time.
      const existing = await QueryBuilderFactory.queryBuilder<IOrder>(
        OrderModel,
      )
        .where("idempotencyKey", idempotencyKey)
        .select("idempotencyKey")
        .executeOne();

      if (existing) {
        throw new Error(
          "Order already initiated. Return to your cart and try checkout.",
        );
      }

      // ── Extract payment data ───────────────────────────────────────────
      /**
       * CRITICAL: do not rename these fields — the webhook handler reads
       * the same shape for payment verification.
       */
      const {
        cartItemsWithShippingMethod: cartItems,
        meta: { address, city, state, postal_code, deliveryType, couponCode },
      } = input;

      // ── Step 1: Validate coupon and get total discount ─────────────────
      // calculateDiscount returns the order-level totalDiscount only.
      // Per-store distribution is handled inside OrderBuilder.build().
      const { totalDiscount, couponType } = await this.calculateDiscount({
        couponCode,
        cartItems,
        userId: user.userId,
      });

      // ── Step 2: Construct order via OrderBuilder ───────────────────────
      const builder = new OrderBuilder()
        .setCustomer({
          userId: user.userId,
          email: user.email,
          name: user.fullName,
          phoneNumber: user.phoneNumber,
        })
        .setShippingAddress({
          address,
          city,
          state,
          postalCode: postal_code,
          deliveryType,
        })
        .setPaymentInfo({
          gateway: PaymentGateway.Flutterwave,
          status: PaymentStatus.Pending,
        })
        .setIdempotencyKey(idempotencyKey);

      // ── Step 3: Add sub-orders ─────────────────────────────────────────
      // Products and shipping only — no financial data attached here.
      // Financial snapshots are computed inside builder.build().
      cartItems.forEach((store) => {
        builder.addSubOrder({
          storeId: store.storeId,
          storeName: store.storeName,
          products: store.products.map((item) => ({
            product: {
              _id: item.product.productId,
              name: item.product.name,
              images: [item.product.image],
              price: Number(item.product.price),
              category: item.product.category[0],
            },
            quantity: item.quantity,
            selectedSize: item.selectedSize
              ? {
                  size: item.selectedSize.size,
                  price: item.selectedSize.price,
                }
              : undefined,
          })),
          shippingMethod: {
            name: store.selectedShippingMethod?.name || "Standard",
            price: Number(store.selectedShippingMethod?.price || 0),
            estimatedDeliveryDays: DateFormatter.estimatedDeliveryRange(
              Number(store.selectedShippingMethod?.estimatedDeliveryDays || 5),
              [0],
            ),
            description: store.selectedShippingMethod?.description,
          },
        });
      });

      // ── Step 4: Apply order-level discount ─────────────────────────────
      // Only the total discount amount is passed in. builder.build() will
      // call DiscountCalculator.distributeDiscountProportionally internally
      // to split it across sub-orders.
      if (totalDiscount > 0) {
        builder.applyDiscount({
          amount: totalDiscount,
          couponCode: couponCode || undefined,
          type: couponType,
          description: `Coupon discount applied: ${couponCode}`,
        });
      }

      // ── Step 5: Build — computes all financials ────────────────────────
      // After this call, every SubOrderBuildResult in orderConfig.subOrders
      // carries a sealed ISubOrderFinancials snapshot.
      const orderConfig = builder.build();

      // ── Step 6: Persist ────────────────────────────────────────────────
      const savedOrder = await OrderRepository.createOrder(
        orderConfig,
        session,
      );

      await session.commitTransaction();
      return savedOrder;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Validates the coupon and computes the order-level totalDiscount in kobo.
   *
   * What this method does:
   *   1. Short-circuits with zero discount when no coupon code is present.
   *   2. Computes the order total (sum of all store amounts) for coupon
   *      validation and discount calculation.
   *   3. Calls CouponService to validate the coupon against the user and total.
   *   4. Calls DiscountCalculator.calculateDiscount to get the scalar discount.
   *   5. Returns totalDiscount and couponType.
   *
   * What this method does NOT do:
   *   - Distribute the discount across stores. That responsibility now lives
   *     entirely in OrderBuilder.build() via DiscountCalculator
   *     .distributeDiscountProportionally. Removing it here eliminates the
   *     previous double-distribution bug where the service split the discount
   *     into discountsPerStore but the builder never consumed that result.
   *
   * @private
   */
  private static async calculateDiscount(params: {
    couponCode?: string | null;
    cartItems: CartItemsWithShippingMethod["cartItemsWithShippingMethod"];
    userId: string;
  }): Promise<{
    totalDiscount: number;
    couponType: CouponTypeEnum | undefined;
  }> {
    if (!params.couponCode?.trim()) {
      return { totalDiscount: 0, couponType: undefined };
    }

    const { couponCode, cartItems, userId } = params;

    // Compute per-store subtotals and grand total for coupon validation.
    // currencyOperations is used here (not OrderCalculations) to stay
    // consistent with the checkout pipeline's existing arithmetic style.
    const storeAmounts = cartItems.map((store) =>
      store.products.reduce((sum: number, item) => {
        const price = item.selectedSize?.price ?? item.product.price;
        return currencyOperations.add(
          sum,
          currencyOperations.multiply(Number(price), item.quantity),
        );
      }, 0),
    );

    const orderTotal = storeAmounts.reduce(
      (sum: number, amount: number) => currencyOperations.add(sum, amount),
      0,
    );

    // Validate the coupon
    const couponService = await CouponService.init();
    const coupon = await couponService.validateCoupon({
      code: couponCode,
      userId,
      orderTotal,
    });

    // Compute the scalar total discount
    const totalDiscount = DiscountCalculator.calculateDiscount(
      { type: coupon.type, value: coupon.value },
      orderTotal,
    );

    return { totalDiscount, couponType: coupon.type };
  }
}
