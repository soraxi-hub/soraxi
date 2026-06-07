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
 * OrderPendingService handles creation of pending orders using the OrderBuilder pattern
 *
 * This service:
 * - Uses OrderBuilder for clean, maintainable order construction
 * - Handles discount calculation and distribution
 * - Manages idempotency to prevent duplicate orders
 * - Orchestrates with CouponService for validation
 * - Manages MongoDB transactions for data consistency
 *
 * The flow: PreparedPaymentData → Discount Calculation → OrderBuilder → OrderService → Database
 *
 * @example
 * ```typescript
 * const order = await OrderPendingService.createPendingOrder({
 *   user,
 *   cart,
 *   input: preparedPaymentData
 * });
 * ```
 */
export class OrderPendingService {
  /**
   * Creates a pending order with payment status = Pending
   *
   * This is the main entry point for creating orders from the checkout flow.
   *
   * @param params - User, cart, and prepared payment data
   * @returns The saved order document
   * @throws DuplicateOrderError if order with same idempotency key exists
   * @throws InvalidOrderStateError if order construction fails
   * @throws Database errors from MongoDB
   *
   * @remarks
   * The method internally handles:
   * 1. Duplicate order detection via idempotency key
   * 2. Coupon validation and discount calculation
   * 3. Proportional discount distribution across stores
   * 4. MongoDB transaction management for consistency
   * 5. Order builder construction and persistence
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

      // Check for duplicate order
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

      // Extract and destructure payment data
      /**
       * Critical: Please note that changing any of this data or field names may break
       * the webhook verification and payment confirmation process. Proceed with caution.
       * If you must change anything here, ensure you also update the webhook handler accordingly.
       */
      const {
        // amount,
        cartItemsWithShippingMethod: cartItems,
        meta: { address, city, state, postal_code, deliveryType, couponCode },
      } = input;

      // Step 1: Calculate discount if coupon is provided
      const { totalDiscount, couponType } = await this.calculateDiscount({
        couponCode,
        cartItems,
        userId: user.userId,
      });

      // Step 2: Build the order using OrderBuilder
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

      // Step 3: Add sub-orders with discount distribution
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

      // Step 4: Apply discount if applicable
      if (totalDiscount > 0) {
        builder.applyDiscount({
          amount: totalDiscount,
          couponCode: couponCode || undefined,
          type: couponType,
          description: `Coupon discount applied: ${couponCode}`,
        });
      }

      // Step 5: Build the order configuration
      const orderConfig = builder.build();

      // Step 6: Persist the order using OrderService
      const savedOrder = await OrderRepository.createOrder(
        orderConfig,
        session,
      );

      // Commit transaction
      await session.commitTransaction();

      return savedOrder;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Calculates discount amount and distributes it proportionally across stores
   *
   * @private
   * @param params - Coupon code, cart items, and user ID
   * @returns Total discount, per-store distribution, and coupon type
   *
   * @remarks
   * If no coupon code is provided, returns zero discount.
   * Discount is distributed proportionally based on each store's percentage of the total order.
   */
  private static async calculateDiscount(params: {
    couponCode?: string | null;
    cartItems: CartItemsWithShippingMethod["cartItemsWithShippingMethod"];
    userId: string;
  }) {
    if (!params.couponCode || !params.couponCode.trim()) {
      return {
        totalDiscount: 0,
        discountsPerStore: [] as number[],
        couponType: undefined as CouponTypeEnum | undefined,
      };
    }

    const { couponCode, cartItems, userId } = params;

    // Calculate order total for coupon validation
    const storeAmounts = cartItems.map((store) => {
      return store.products.reduce((sum: number, item) => {
        const price = item.selectedSize?.price || item.product.price;
        return currencyOperations.add(
          sum,
          currencyOperations.multiply(Number(price), item.quantity),
        );
      }, 0);
    });

    const orderTotal = storeAmounts.reduce(
      (sum: number, amount: number) => currencyOperations.add(sum, amount),
      0,
    );

    // Validate coupon
    const couponService = await CouponService.init();
    const coupon = await couponService.validateCoupon({
      code: couponCode,
      userId,
      orderTotal,
    });

    // Calculate total discount
    const totalDiscount = DiscountCalculator.calculateDiscount(
      {
        type: coupon.type,
        value: coupon.value,
      },
      orderTotal,
    );

    // Distribute discount proportionally across stores
    const proportionalBreakdown =
      DiscountCalculator.distributeDiscountProportionally(
        totalDiscount,
        storeAmounts,
      );

    return {
      totalDiscount,
      discountsPerStore: proportionalBreakdown.distribution,
      couponType: coupon.type,
    };
  }
}
