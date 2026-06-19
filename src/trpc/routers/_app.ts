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
import { storeWalletRouter } from "@/modules/server/store/wallet-management/fetch-wallet/procedures";
import { vendorPayoutRouter } from "@/modules/server/store/payout/store-payouts/procedures";
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
import { requestRouter } from "@/modules/server/demand-listings/procedures";
import { adminDisputeRouter } from "@/modules/server/admin/disputes/procedures";
import { customerDisputeRouter } from "@/modules/server/user/disputes/procedures";
import { vendorDisputeRouter } from "@/modules/server/store/disputes/vendor-dispute.procedures";
import { platformWalletRouter } from "@/modules/server/admin/platform-wallet/procedures";
import { adminPayoutRouter } from "@/modules/server/admin/payouts/procedures";
import { waitlistRouter } from "@/modules/server/waitlist/procedure";
import { adminFinancialMetricsRouter } from "@/modules/server/admin/financials/procedures";

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
  waitlist: waitlistRouter,
  admin: adminProductRouter,
  demandListing: requestRouter,
  adminStore: adminStoreRouter,
  adminAuditLog: auditLogRouter,
  publicStore: publicStoreRouter,
  withdrawal: vendorPayoutRouter,
  adminCoupon: adminCouponRouter,
  adminOrders: adminOrdersRouter,
  storeWallet: storeWalletRouter,
  orderStatus: orderStatusRouter,
  storeOrders: storeOrdersRouter,
  adminPayout: adminPayoutRouter,
  flutterwave: flutterwaveRouter,
  storeProfile: storeProfileRouter,
  adminDispute: adminDisputeRouter,
  storeProducts: storeProductRouter,
  storeShipping: storeShippingRouter,
  vendorDispute: vendorDisputeRouter,
  productReview: productReviewRouter,
  platformWallet: platformWalletRouter,
  adminManagement: adminManagementRouter,
  customerDispute: customerDisputeRouter,
  adminFinancialMetrics: adminFinancialMetricsRouter,
  flutterwavePaymentVerification: flutterwavePaymentVerificationRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
