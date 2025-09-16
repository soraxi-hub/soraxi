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
import { paymentRouter } from "@/modules/server/store/payout-account/procedures";
import { storeOrdersRouter } from "@/modules/server/store/store-orders/procedures";
import { storeProfileRouter } from "@/modules/server/store/profile/procedures";
import { storeShippingRouter } from "@/modules/server/store/shipping/procedures";
import { adminStoreRouter } from "@/modules/server/admin/store/procedures";
import { adminOrdersRouter } from "@/modules/server/admin/orders/procedures";
import { deliveryConfirmationRouter } from "@/modules/server/admin/delivery-confirmation/procedure";
import { adminEscrowReleaseQueueRouter } from "@/modules/server/admin/escrow-management/escrow-release-queue/procedure";
import { adminEscrowDetailRouter } from "@/modules/server/admin/escrow-management/admin-escrow-detail/procedure";
import { adminEscrowReleaseRouter } from "@/modules/server/admin/escrow-management/admin-escrow-release/procedure";
import { storeWalletRouter } from "@/modules/server/store/wallet-management/fetch-wallet/procedures";
import { storeWalletTransactionsRouter } from "@/modules/server/store/wallet-management/store-wallet-transactions/procedures";
import { withdrawalRouter } from "@/modules/server/withdrawal-router/procedure";
import { productReviewRouter } from "@/modules/server/reviews/products/procedures";
import { orderStatusRouter } from "@/modules/server/store/store-orders/order-status-management/procedures";
import { adminRefundRouter } from "@/modules/server/admin/admin-refund-management/fetch-eligible-refunds/procedures";
import { adminRefundDetailRouter } from "@/modules/server/admin/admin-refund-management/refund-details/procedures";
import { adminManagementRouter } from "@/modules/server/admin/admin-management/procedures";
import { auditLogRouter } from "@/modules/server/admin/audit-logs/procedures";
import { storeProductRouter } from "@/modules/server/store/products/procedure";
import { flutterwaveRouter } from "@/modules/server/flutterwave/procedures";

export const appRouter = createTRPCRouter({
  user: userRouter,
  store: storeRouter,
  admin: adminRouter,
  home: homeRouter,
  cart: cartRouter,
  wishlist: wishlistRouter,
  checkout: checkoutRouter,
  paystack: paystackRouter,
  flutterwave: flutterwaveRouter,
  order: orderRouter,
  storeOrders: storeOrdersRouter,
  payment: paymentRouter,
  storeProfile: storeProfileRouter,
  storeShipping: storeShippingRouter,
  adminStore: adminStoreRouter,
  adminOrders: adminOrdersRouter,
  adminDeliveryConfirmation: deliveryConfirmationRouter,
  adminEscrowReleaseQueue: adminEscrowReleaseQueueRouter,
  adminEscrowDetail: adminEscrowDetailRouter,
  adminEscrowRelease: adminEscrowReleaseRouter,
  storeWallet: storeWalletRouter,
  withdrawal: withdrawalRouter,
  productReview: productReviewRouter,
  storeWalletTransactions: storeWalletTransactionsRouter,
  orderStatus: orderStatusRouter,
  adminRefund: adminRefundRouter,
  adminRefundDetail: adminRefundDetailRouter,
  adminManagement: adminManagementRouter,
  adminAuditLog: auditLogRouter,
  storeProducts: storeProductRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
