import { userRouter } from "@/modules/server/user/procedures";
import { createTRPCRouter } from "../init";
import { storeRouter } from "@/modules/server/store/procedures";
import { adminProductRouter } from "@/modules/server/admin/procedures";
import { homeRouter } from "@/modules/server/home/procedures";
import { cartRouter } from "@/modules/server/cart/procedures";
import { wishlistRouter } from "@/modules/server/wishlist/procedures";
import { checkoutRouter } from "@/modules/server/checkout/procedures";
import { paystackRouter } from "@/modules/server/paystack/procedures";
import { orderRouter } from "@/modules/server/order/procedures";
import { paymentRouter } from "@/modules/server/store/payout-account/procedures";
import { storeOrdersRouter } from "@/modules/server/store/store-orders/procedures";
import { storeProfileRouter } from "@/modules/server/store/profile/procedures";
import { storeShippingRouter } from "@/modules/server/store/shipping/procedures";
import { adminStoreRouter } from "@/modules/server/admin/store/procedures";
import { adminOrdersRouter } from "@/modules/server/admin/orders/procedures";
import { deliveryConfirmationRouter } from "@/modules/server/admin/delivery-confirmation/procedure";
import { storeWalletRouter } from "@/modules/server/store/wallet-management/fetch-wallet/procedures";
import { storeWalletTransactionsRouter } from "@/modules/server/store/wallet-management/store-wallet-transactions/procedures";
import { withdrawalRouter } from "@/modules/server/withdrawal-router/procedure";
import { productReviewRouter } from "@/modules/server/reviews/products/procedures";
import { orderStatusRouter } from "@/modules/server/store/store-orders/order-status-management/procedures";
import { adminManagementRouter } from "@/modules/server/admin/admin-management/procedures";
import { auditLogRouter } from "@/modules/server/admin/audit-logs/procedures";
import { storeProductRouter } from "@/modules/server/store/products/procedure";
import { flutterwaveRouter } from "@/modules/server/flutterwave/procedures";
import { publicStoreRouter } from "@/modules/server/public-store/public-store-procedures";
import { adminCouponRouter } from "@/modules/server/admin/coupon/procedures";
import { couponRouter } from "@/modules/server/coupon/procedures";
import { flutterwavePaymentVerificationRouter } from "@/modules/server/flutterwave/payment-verification/procedures";
import { storeFundReleaseRouter } from "@/modules/server/store/fund-release/procedures";
import { adminFundReleaseRouter } from "@/modules/server/admin/admin-fund-release/procedures";

export const appRouter = createTRPCRouter({
  user: userRouter,
  home: homeRouter,
  cart: cartRouter,
  store: storeRouter,
  order: orderRouter,
  coupon: couponRouter,
  payment: paymentRouter,
  wishlist: wishlistRouter,
  checkout: checkoutRouter,
  paystack: paystackRouter,
  admin: adminProductRouter,
  adminStore: adminStoreRouter,
  withdrawal: withdrawalRouter,
  adminAuditLog: auditLogRouter,
  publicStore: publicStoreRouter,
  adminCoupon: adminCouponRouter,
  adminOrders: adminOrdersRouter,
  storeWallet: storeWalletRouter,
  orderStatus: orderStatusRouter,
  storeOrders: storeOrdersRouter,
  flutterwave: flutterwaveRouter,
  storeProfile: storeProfileRouter,
  storeProducts: storeProductRouter,
  storeShipping: storeShippingRouter,
  productReview: productReviewRouter,
  adminManagement: adminManagementRouter,
  storeFundRelease: storeFundReleaseRouter,
  adminFundRelease: adminFundReleaseRouter,
  adminDeliveryConfirmation: deliveryConfirmationRouter,
  storeWalletTransactions: storeWalletTransactionsRouter,
  flutterwavePaymentVerification: flutterwavePaymentVerificationRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
