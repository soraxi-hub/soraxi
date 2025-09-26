import { flutterwaveInputSchema } from "@/modules/server/flutterwave/procedures";
import { z } from "zod";
import { SubOrder } from "./sub-order";
import { DeliveryStatus, StatusHistory } from "@/enums";
import { calculateEstimatedDeliveryDays } from "@/lib/utils/calculate-est-delivery-days";

type CartItems = z.infer<
  typeof flutterwaveInputSchema
>[`cartItemsWithShippingMethod`];

export class SubOrderFactory {
  //   static createFromCartItems(cartItems: CartItems) {
  //     return cartItems.map((store) => {
  //       const products = store.products.map((item) => {
  //         const base = {
  //           Product: item.product._id,
  //           store: item.storeID,
  //           productSnapshot: {
  //             _id: item.product._id,
  //             name: item.product.name,
  //             images: item.product.images,
  //             quantity: Number(item.quantity),
  //             price: Number(item.selectedSize?.price || item.product.price),
  //           },
  //           storeSnapshot: {
  //             _id: store.storeID,
  //             name: store.storeName,
  //           },
  //         };

  //         return base;
  //       });

  //       const storeTotal = products.reduce(
  //         (sum, item) =>
  //           sum + item.productSnapshot.price * item.productSnapshot.quantity,
  //         0
  //       );

  //       return {
  //         store: store.storeID,
  //         products,
  //         totalAmount: storeTotal,
  //         shippingMethod: {
  //           name: store.selectedShippingMethod?.name,
  //           price: Number(store.selectedShippingMethod?.price || 0),
  //           estimatedDeliveryDays: calculateEstimatedDeliveryDays(
  //             Number(store.selectedShippingMethod?.estimatedDeliveryDays || 3)
  //           ),
  //           description: store.selectedShippingMethod?.description,
  //         },
  //         escrow: { held: true, released: false, refunded: false },
  //         statusHistory: [
  //           {
  //             status: StatusHistory.OrderPlaced,
  //             notes: "Initial Order request created.",
  //           },
  //         ],
  //       };
  //     });
  //   }

  static createFromCartItems(cartItems: CartItems): SubOrder[] {
    return cartItems.map((store) => {
      const products = store.products.map((item) => ({
        productId: item.product._id,
        storeId: item.storeId,
        productSnapshot: {
          _id: item.product._id,
          name: item.product.name,
          images: item.product.images,
          quantity: Number(item.quantity),
          price: Number(item.selectedSize?.price || item.product.price),
        },
        storeSnapshot: {
          _id: store.storeId,
          name: store.storeName,
        },
      }));

      const storeTotal = products.reduce(
        (sum, p) => sum + p.productSnapshot.price * p.productSnapshot.quantity,
        0
      );

      return new SubOrder({
        storeId: store.storeId,
        products,
        totalAmount: storeTotal,
        deliveryStatus: DeliveryStatus.OrderPlaced,
        shippingMethod: {
          name: store.selectedShippingMethod?.name,
          price: Number(store.selectedShippingMethod?.price || 0),
          estimatedDeliveryDays: calculateEstimatedDeliveryDays(
            Number(store.selectedShippingMethod?.estimatedDeliveryDays || 3)
          ),
          description: store.selectedShippingMethod?.description,
        },
        escrow: { held: true, released: false, refunded: false },
        statusHistory: [
          {
            status: StatusHistory.OrderPlaced,
            notes: "Initial Order request created.",
          },
        ],
      });
    });
  }
}
