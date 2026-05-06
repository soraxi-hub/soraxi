import mongoose from "mongoose";
import { getOrderModel } from "@/lib/db/models/order.model";
import { calculateEstimatedDeliveryDays } from "@/lib/utils/calculate-est-delivery-days";
import {
  DeliveryStatus,
  StatusHistory,
  PaymentStatus,
  PaymentGateway,
} from "@/enums";
import type { FlutterwaveInput } from "@/validators/order-input-validators";
import type { ICart } from "@/lib/db/models/cart.model";
import { TRPCError } from "@trpc/server";
import { DiscountCalculator } from "@/lib/utils/discount-calculator";
import { CouponService } from "./coupon.service";
import { currencyOperations } from "@/lib/utils/naira";
import { CouponTypeEnum } from "@/validators/coupon-validations";
import { UserTokenPayload } from "./cookies-&-auth-tokens/cookies-auth-tokens.service";

type CreatePendingOrderParams = {
  user: UserTokenPayload;
  cart: ICart;
  input: FlutterwaveInput;
};

export class OrderService {
  async createPendingOrder({ user, cart, input }: CreatePendingOrderParams) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const Order = await getOrderModel();
      const idempotencyKey = cart.idempotencyKey;

      const existing = await Order.findOne({ idempotencyKey });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "It looks like this order was already initiated. Please go back to your cart and try checking out again.",
        });
      }

      /**
       * Critical: Please note that changing any of this data or field names may break
       * the webhook verification and payment confirmation process. Proceed with caution.
       * If you must change anything here, ensure you also update the webhook handler accordingly.
       */
      const {
        amount,
        cartItemsWithShippingMethod: cartItems,
        meta: { address, city, state, postal_code, deliveryType, couponCode },
      } = input;

      const storeIds = [...new Set(cartItems.map((s) => s.storeId))];

      let totalDiscount = 0;
      let discountsPerStore: number[] = [];
      let couponType: CouponTypeEnum | undefined;

      // Prepare store amounts for proportional distribution
      const storeAmounts = cartItems.map((store) => {
        return store.products.reduce((sum, item) => {
          const price = item.selectedSize?.price || item.product.price;
          return currencyOperations.add(
            sum,
            currencyOperations.multiply(Number(price), item.quantity),
          );
        }, 0);
      });

      const orderTotal = storeAmounts.reduce(
        (sum, amount) => currencyOperations.add(sum, amount),
        0,
      );

      // If couponCode is present, calculate and distribute discount proportionally
      if (couponCode) {
        // Fetch coupon from DB, validate it
        const couponService = await CouponService.init();
        const validationParams = {
          code: couponCode,
          userId: user.id,
          orderTotal,
        };

        const coupon = await couponService.validateCoupon(validationParams);
        // Calculate total discount using DiscountCalculator.calculateDiscount()
        couponType = coupon.type;
        const params = {
          type: coupon.type,
          value: coupon.value,
        };
        totalDiscount = DiscountCalculator.calculateDiscount(
          params,
          orderTotal,
        );
        // For this implementation, we'll prepare the structure
        const proportionalBreakdown =
          DiscountCalculator.distributeDiscountProportionally(
            totalDiscount,
            storeAmounts,
          );
        discountsPerStore = proportionalBreakdown.distribution;
      }

      const subOrders = cartItems.map((store, index) => {
        const products = store.products.map((item) => {
          const price = item.selectedSize?.price || item.product.price;

          return {
            productId: item.product._id,
            storeId: store.storeId,
            productSnapshot: {
              _id: item.product._id,
              name: item.product.name,
              images: item.product.images,
              price: Number(price),
              quantity: item.quantity,
              selectedSize: item.selectedSize
                ? {
                    size: item.selectedSize.size,
                    price: item.selectedSize.price,
                  }
                : undefined,
            },
            storeSnapshot: {
              _id: store.storeId,
              name: store.storeName,
            },
          };
        });

        const storeTotal = products.reduce(
          (sum, p) =>
            currencyOperations.add(
              sum,
              currencyOperations.multiply(
                p.productSnapshot.price,
                p.productSnapshot.quantity,
              ),
            ),
          0,
        );

        const storeDiscount = discountsPerStore[index] || 0;
        // The discount is tracked but doesn't affect store settlement
        const discountedTotal = currencyOperations.subtract(
          storeTotal,
          storeDiscount,
        );

        return {
          storeId: store.storeId,
          products,
          originalAmount: storeTotal, // Store gets paid on this amount (before commission)
          totalAmount: discountedTotal, // For customer-facing display
          discount:
            storeDiscount > 0
              ? {
                  // Add discount object
                  amount: storeDiscount,
                  couponCode: couponCode || undefined,
                  type: couponType,
                  description: `Discount from coupon: ${couponCode}`,
                }
              : undefined,
          deliveryStatus: DeliveryStatus.OrderPlaced,
          shippingMethod: {
            name: store.selectedShippingMethod?.name,
            price: Number(store.selectedShippingMethod?.price || 0),
            estimatedDeliveryDays: calculateEstimatedDeliveryDays(
              Number(store.selectedShippingMethod?.estimatedDeliveryDays || 5),
            ),
            description: store.selectedShippingMethod?.description,
          },
          statusHistory: [
            {
              status: StatusHistory.OrderPlaced,
              notes: "Initial order request created.",
            },
          ],
        };
      });

      const orderDoc = new Order({
        userId: user.id,
        stores: storeIds,
        subOrders,
        totalAmount: amount,
        couponCode: couponCode || undefined,
        discount:
          totalDiscount > 0
            ? {
                // Add discount object to order
                amount: totalDiscount,
                couponCode: couponCode || undefined,
                type: couponType,
                description: `Coupon discount applied: ${couponCode}`,
              }
            : undefined,
        shippingAddress: {
          postalCode: postal_code,
          address: `${state}, ${city}, ${address}`,
          deliveryType,
        },
        idempotencyKey,
        paymentStatus: PaymentStatus.Pending,
        paymentGateway: PaymentGateway.Flutterwave,
      });

      const savedOrder = await orderDoc.save({ session });

      await session.commitTransaction();
      session.endSession();

      return savedOrder;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

// import mongoose from "mongoose";
// import { getOrderModel } from "@/lib/db/models/order.model";
// import { calculateEstimatedDeliveryDays } from "@/lib/utils/calculate-est-delivery-days";
// import {
//   DeliveryStatus,
//   StatusHistory,
//   PaymentStatus,
//   PaymentGateway,
// } from "@/enums";
// import { TokenData } from "@/lib/helpers/get-user-from-cookie";
// import { FlutterwaveInput } from "@/validators/order-input-validators";
// import { ICart } from "@/lib/db/models/cart.model";
// import { TRPCError } from "@trpc/server";

// type CreatePendingOrderParams = {
//   user: TokenData;
//   cart: ICart;
//   input: FlutterwaveInput;
// };

// export class OrderService {
//   async createPendingOrder({ user, cart, input }: CreatePendingOrderParams) {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const Order = await getOrderModel();
//       const idempotencyKey = cart.idempotencyKey;

//       const existing = await Order.findOne({ idempotencyKey });
//       if (existing) {
//         throw new TRPCError({
//           code: "CONFLICT",
//           message:
//             "It looks like this order was already initiated. Please go back to your cart and try checking out again.",
//         });
//       }

//       /**
//        * Critical: Please note that changing any of this data or field names may break
//        * the webhook verification and payment confirmation process. Proceed with caution.
//        * If you must change anything here, ensure you also update the webhook handler accordingly.
//        */
//       const {
//         amount,
//         cartItemsWithShippingMethod: cartItems,
//         meta: { address, city, state, postal_code, deliveryType },
//       } = input;

//       const storeIds = [...new Set(cartItems.map((s) => s.storeId))];

//       const subOrders = cartItems.map((store) => {
//         const products = store.products.map((item) => {
//           const price = item.selectedSize?.price || item.product.price;

//           return {
//             productId: item.product._id,
//             storeId: store.storeId,
//             productSnapshot: {
//               _id: item.product._id,
//               name: item.product.name,
//               images: item.product.images,
//               price: Number(price),
//               quantity: item.quantity,
//               selectedSize: item.selectedSize
//                 ? {
//                     size: item.selectedSize.size,
//                     price: item.selectedSize.price,
//                   }
//                 : undefined,
//             },
//             storeSnapshot: {
//               _id: store.storeId,
//               name: store.storeName,
//             },
//           };
//         });

//         const storeTotal = products.reduce(
//           (sum, p) =>
//             sum + p.productSnapshot.price * p.productSnapshot.quantity,
//           0
//         );

//         return {
//           storeId: store.storeId,
//           products,
//           totalAmount: storeTotal,
//           deliveryStatus: DeliveryStatus.OrderPlaced,
//           shippingMethod: {
//             name: store.selectedShippingMethod?.name,
//             price: Number(store.selectedShippingMethod?.price || 0),
//             estimatedDeliveryDays: calculateEstimatedDeliveryDays(
//               Number(store.selectedShippingMethod?.estimatedDeliveryDays || 5)
//             ),
//             description: store.selectedShippingMethod?.description,
//           },
//           statusHistory: [
//             {
//               status: StatusHistory.OrderPlaced,
//               notes: "Initial order request created.",
//             },
//           ],
//         };
//       });

//       const orderDoc = new Order({
//         userId: user.id,
//         stores: storeIds,
//         subOrders,
//         totalAmount: amount,
//         shippingAddress: {
//           postalCode: postal_code,
//           address: `${state}, ${city}, ${address}`,
//           deliveryType,
//         },
//         idempotencyKey,
//         deliveryType,
//         paymentStatus: PaymentStatus.Pending,
//         paymentGateway: PaymentGateway.Flutterwave,
//       });

//       const savedOrder = await orderDoc.save({ session });

//       await session.commitTransaction();
//       session.endSession();

//       return savedOrder;
//     } catch (err) {
//       await session.abortTransaction();
//       session.endSession();
//       throw err;
//     }
//   }
// }
