import { userRouter } from "@/modules/server/user/procedures";
import { createTRPCRouter } from "../init";
import { storeRouter } from "@/modules/server/store/procedures";
import { adminProductRouter } from "@/modules/server/admin/procedures";
import { homeRouter } from "@/modules/server/home/procedures";
import { cartRouter } from "@/modules/server/cart/procedures";
import { wishlistRouter } from "@/modules/server/wishlist/procedures";
import { checkoutRouter } from "@/modules/server/checkout/procedures";
import { orderRouter } from "@/modules/server/order/procedures";
import { paymentRouter as storePayoutAccountRouter } from "@/modules/server/store/payout-account/procedures";
import { storeOrdersRouter } from "@/modules/server/store/store-orders/procedures";
import { storeProfileRouter } from "@/modules/server/store/profile/procedures";
import { storeShippingRouter } from "@/modules/server/store/shipping/procedures";
import { adminStoreRouter } from "@/modules/server/admin/store/procedures";
import { adminOrdersRouter } from "@/modules/server/admin/orders/procedures";
import { storeWalletRouter } from "@/modules/server/store/wallet-management/fetch-wallet/procedures";
import { vendorPayoutRouter } from "@/modules/server/store/payout/store-payouts/procedures";
import { productReviewRouter } from "@/modules/server/reviews/products/procedures";
import { orderStatusRouter as storeOrderStatusRouter } from "@/modules/server/store/store-orders/order-status-management/procedures";
import { deliveryProofRouter } from "@/modules/server/store/store-orders/delivery-proof/procedures";
import { adminManagementRouter } from "@/modules/server/admin/admin-management/procedures";
import { auditLogRouter } from "@/modules/server/admin/audit-logs/procedures";
import { storeProductRouter } from "@/modules/server/store/products/procedure";
import { paymentRouter } from "@/modules/server/payment/procedures";
import { publicStoreRouter } from "@/modules/server/public-store/public-store-procedures";
import { adminCouponRouter } from "@/modules/server/admin/coupon/procedures";
import { couponRouter } from "@/modules/server/coupon/procedures";
import { orderStatusRouter } from "@/modules/server/order-status/procedures";
import { requestRouter } from "@/modules/server/demand-listings/procedures";
import { adminDisputeRouter } from "@/modules/server/admin/disputes/procedures";
import { customerDisputeRouter } from "@/modules/server/user/disputes/procedures";
import { vendorDisputeRouter } from "@/modules/server/store/disputes/vendor-dispute.procedures";
import { platformWalletRouter } from "@/modules/server/admin/platform-wallet/procedures";
import { adminPayoutRouter } from "@/modules/server/admin/payouts/procedures";
import { waitlistRouter } from "@/modules/server/waitlist/procedure";
import { adminFinancialMetricsRouter } from "@/modules/server/admin/financials/procedures";
import { adminRefundRouter } from "@/modules/server/admin/refunds/procedures";
import { adminModerationRouter } from "@/modules/server/admin/moderation/procedures";
import { deliveryConfirmationRouter } from "@/modules/server/delivery/procedures";
import { customerMessagingRouter } from "@/modules/server/messaging/customer.procedures";
import { vendorMessagingRouter } from "@/modules/server/messaging/vendor.procedures";

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
  waitlist: waitlistRouter,
  admin: adminProductRouter,
  orderStatus: orderStatusRouter,
  demandListing: requestRouter,
  adminStore: adminStoreRouter,
  adminAuditLog: auditLogRouter,
  publicStore: publicStoreRouter,
  withdrawal: vendorPayoutRouter,
  adminCoupon: adminCouponRouter,
  adminOrders: adminOrdersRouter,
  storeWallet: storeWalletRouter,
  storeOrderStatus: storeOrderStatusRouter,
  storePayoutAccount: storePayoutAccountRouter,
  deliveryProof: deliveryProofRouter,
  storeOrders: storeOrdersRouter,
  adminPayout: adminPayoutRouter,
  adminRefund: adminRefundRouter,
  storeProfile: storeProfileRouter,
  adminDispute: adminDisputeRouter,
  storeProducts: storeProductRouter,
  storeShipping: storeShippingRouter,
  vendorDispute: vendorDisputeRouter,
  vendorMessaging: vendorMessagingRouter,
  adminModeration: adminModerationRouter,
  deliveryConfirmation: deliveryConfirmationRouter,
  customerMessaging: customerMessagingRouter,
  productReview: productReviewRouter,
  platformWallet: platformWalletRouter,
  adminManagement: adminManagementRouter,
  customerDispute: customerDisputeRouter,
  adminFinancialMetrics: adminFinancialMetricsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
