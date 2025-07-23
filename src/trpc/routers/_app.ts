import { userRouter } from "@/modules/server/user/procedures";
import { createTRPCRouter } from "../init";
import { storeRouter } from "@/modules/server/store/procedures";
import { adminRouter } from "@/modules/server/admin/procedures";
import { homeRouter } from "@/modules/server/home/procedures";
import { cartRouter } from "@/modules/server/cart/procedures";
import { wishlistRouter } from "@/modules/server/wishlist/procedures";
import { checkoutRouter } from "@/modules/server/checkout/procedures";
import { paystackRouter } from "@/modules/server/paystack/procedures";
import { orderRouter } from "@/modules/server/order/procedures";
import { paymentRouter } from "@/modules/server/payment/procedures";
import { storeOrdersRouter } from "@/modules/server/store/store-orders/procedures";
import { storeProfileRouter } from "@/modules/server/store/profile/procedures";
import { storeShippingRouter } from "@/modules/server/store/shipping/procedures";
import { adminStoreRouter } from "@/modules/server/admin/store/procedures";

export const appRouter = createTRPCRouter({
  user: userRouter,
  store: storeRouter,
  admin: adminRouter,
  home: homeRouter,
  cart: cartRouter,
  wishlist: wishlistRouter,
  checkout: checkoutRouter,
  paystack: paystackRouter,
  order: orderRouter,
  storeOrders: storeOrdersRouter,
  payment: paymentRouter,
  storeProfile: storeProfileRouter,
  storeShipping: storeShippingRouter,
  adminStore: adminStoreRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
