import { PaymentStatus } from "@/enums";
import {
  getOrderModel,
  IOrderDocument,
  type IOrder,
} from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import mongoose, { type Model } from "mongoose";
import type { FlutterwaveTransactionData } from "@/domain/payment/gateways/flutterwave.gateway";
import { OrderNotificationService } from "@/services/orders/order-notification.service";
import { CouponService } from "@/services/coupon.service";
import { NotificationFactory, renderTemplate } from "../../domain/notification";
import React from "react";
import { CouponRedemptionFailureEmail } from "@/services/notifications/templates/coupon-redemption-failure-email-admin";
import { calculateCommission } from "@/lib/utils/calculate-commission";
import { createTransactionRecord } from "@/lib/db/models/transaction-record.model";
import { creditVendorPendingBalance } from "@/lib/db/models/vendor-wallet.model";
import { creditPlatformCommission } from "@/lib/db/models/platform-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  FlutterwavePaymentStatus,
  SuborderFinancialStatus,
} from "@/enums/financial.enums";

type CustomerInfo = {
  fullName: string;
  email: string;
};

type UpdateOrderRecordProps = {
  orderId: string;
  idempotencyKey: string;
  session: mongoose.ClientSession | null;
  paymentMethod: string;
  customerInfo: CustomerInfo;
};

export class ProcessOrder {
  private Order!: Model<IOrderDocument>;
  private orderNotificationService = new OrderNotificationService();

  private constructor() {}

  static async init(): Promise<ProcessOrder> {
    const service = new ProcessOrder();
    service.Order = await getOrderModel();
    await getStoreModel();
    return service;
  }

  async updateOrderRecordToSuccessState({
    orderId,
    idempotencyKey,
    session,
    paymentMethod,
    customerInfo,
  }: UpdateOrderRecordProps): Promise<{
    ok: boolean;
    error?: string;
    message?: string;
    userId?: string;
  }> {
    const statusArr = [PaymentStatus.Failed, PaymentStatus.Cancelled];

    // find order by ID
    const order = await this.Order.findById(
      new mongoose.Types.ObjectId(orderId),
    ).populate("subOrders.storeId");

    if (!order) {
      return { ok: false, error: "Order not found" };
    }

    // check idempotencyKey to prevent duplicate processing
    if (order.idempotencyKey === idempotencyKey) {
      if (order.paymentStatus === PaymentStatus.Paid) {
        return {
          ok: true,
          message: "Order already paid",
          userId: order.userId.toString(),
        };
      }
      if (statusArr.includes(order.paymentStatus)) {
        return {
          ok: true,
          message: "Order in terminal state",
          userId: order.userId.toString(),
        };
      }
      // else → pending, allow update to continue
    }

    // Redeem coupon for this user
    const couponCode = order.couponCode;
    if (couponCode) {
      const couponService = await CouponService.init();

      try {
        await couponService.redeemCoupon(
          couponCode,
          order.userId.toString(),
          order._id.toString(),
        );
      } catch (error: any) {
        // don't throw the error but log it instead.
        console.error(
          "[TRPC or Webhook] Coupon Redemption Error:",
          error.message ||
            `Failed to redeem coupon for code: ${couponCode}, user: ${order.userId}, order: ${order._id}`,
        );

        await (async () => {
          const subject = `Admin Alert: Coupon Redemption Failed`;
          const html = await renderTemplate(
            React.createElement(CouponRedemptionFailureEmail, {
              orderId: order._id.toString(),
              customerEmail: customerInfo.email,
              couponCode,
              reason: error.message,
            }),
          );

          const notification = NotificationFactory.create("email", {
            recipient: "admin@soraxihub.com",
            subject,
            emailType: "noreply",
            fromAddress: "noreply@soraxihub.com",
            html,
            text: `Coupon redemption failed for order ${order._id}`,
          });

          await notification.send();
        })();
      }
    }

    // update payment status
    order.paymentStatus = PaymentStatus.Paid;
    order.paymentMethod = paymentMethod;
    await order.save({ session });

    try {
      await this.processPaymentConfirmedFinancials(
        order,
        idempotencyKey,
        session,
      );
    } catch (error) {
      console.error(
        "Critical financial processing failure for order:",
        order._id,
        error,
      );
      // NOTE: Same principle applies — don't fail the order.
      // Flag for admin review and retry queue (covered in Layer 4: Background Jobs)
    }

    // Send notifications
    await Promise.all([
      this.orderNotificationService.sendCustomerNotification(
        order,
        customerInfo,
      ),
      this.orderNotificationService.sendStoreNotifications(order, customerInfo),
    ]);

    return {
      ok: true,
      message: "Order record updated successfully",
      userId: order.userId.toString(),
    };
  }

  private async processPaymentConfirmedFinancials(
    order: IOrder,
    flutterwaveReference: string,
    session: mongoose.ClientSession | null,
  ): Promise<void> {
    // Journal entry writes always involve multiple documents — a session is
    // required to guarantee atomicity. Throw early rather than risk a
    // partially-written ledger.
    if (!session) {
      throw new Error(
        "processPaymentConfirmedFinancials requires a MongoDB ClientSession.",
      );
    }

    // ----------------------------------------------------------------
    // STEP 1: Build the suborder breakdowns using calculateCommission
    // ----------------------------------------------------------------
    const suborderBreakdowns = order.subOrders.map((subOrder) => {
      const { commission, settleAmount, details } = calculateCommission(
        subOrder.totalAmount,
      );

      /**
       * `subOrder.storeId` is populated earlier via:
       *
       *   .populate("subOrders.storeId")
       *
       * When Mongoose populates a reference field, the field no longer contains
       * just the ObjectId. Instead, it contains the full Store document.
       *
       * Since downstream financial services (wallets, ledgers, transaction records)
       * expect a vendor/store ObjectId, we normalize the value here by extracting
       * the Store document's `_id` when populated, or using the raw ObjectId when
       * it has not been populated.
       *
       * Without this normalization, we could accidentally pass an entire Store
       * document into queries expecting an ObjectId, resulting in errors such as:
       *
       *   CastError: Cast to ObjectId failed for value "{ ...store document... }"
       */
      const vendorId =
        typeof subOrder.storeId === "object"
          ? subOrder.storeId._id
          : subOrder.storeId;

      return {
        suborderId: subOrder._id,
        vendorId,
        grossAmount: subOrder.totalAmount,
        commission,
        settleAmount,
        commissionDetails: {
          percentageFee: details.percentageFee,
          flatFeeApplied: details.flatFeeApplied,
        },
        status: SuborderFinancialStatus.PENDING,
      };
    });

    // ----------------------------------------------------------------
    // STEP 2: Create the Transaction Record
    // One record per order linking Flutterwave to all suborder breakdowns
    // ----------------------------------------------------------------
    await createTransactionRecord(
      {
        customerId: order.userId,
        orderId: order._id,
        flutterwaveReference,
        flutterwaveStatus: FlutterwavePaymentStatus.SUCCESSFUL,
        totalAmount: order.totalAmount,
        suborderBreakdowns,
      },
      session,
    );

    // ----------------------------------------------------------------
    // STEP 3: Write journal entries via the double-entry writer
    //
    // Both entries are scoped to the order level — not per suborder —
    // because each represents a single atomic financial event:
    //
    //   PAYMENT_RECEIVED: the full gross amount enters escrow in one movement.
    //
    //   ORDER_SETTLED: escrow is split across all vendors (one CREDIT line each)
    //   and the platform commission, in one balanced journal entry.
    //
    // The writer enforces the double-entry invariant (credits === debits) and
    // writes both the JournalEntry header and all LedgerLine documents
    // atomically within the same session before any wallet state is touched.
    // ----------------------------------------------------------------
    const writer = await JournalEntryWriter.init();

    // --- PAYMENT_RECEIVED ---
    // The full order amount enters the platform's escrow account.
    // Offsets: DEBIT PLATFORM_ESCROW / CREDIT CUSTOMER_REFUND_PAYABLE
    await writer.writePaymentReceived({
      totalAmount: order.totalAmount,
      orderId: order._id,
      flutterwaveReference,
      session,
    });

    // --- ORDER_SETTLED ---
    // Escrow is split: each vendor receives their net settle amount into
    // VENDOR_PENDING, and the platform earns commission revenue.
    // Offsets: DEBIT CUSTOMER_REFUND_PAYABLE / CREDIT VENDOR_PENDING (×n) + PLATFORM_REVENUE_COMMISSION
    const totalCommission = suborderBreakdowns.reduce(
      (sum, b) => sum + b.commission,
      0,
    );

    await writer.writeOrderSettlement({
      vendorSettlements: suborderBreakdowns.map((b) => ({
        vendorId: b.vendorId,
        settleAmount: b.settleAmount,
        suborderId: b.suborderId,
      })),
      totalCommission,
      totalAmount: order.totalAmount,
      orderId: order._id,
      session,
    });

    // ----------------------------------------------------------------
    // STEP 4: Update wallet running-state caches
    //
    // The ledger is the source of truth — wallet documents are fast-read
    // caches that mirror the ledger. These updates must happen after the
    // journal entries are committed so the two never diverge mid-write.
    // ----------------------------------------------------------------
    for (const breakdown of suborderBreakdowns) {
      // Credit the vendor's pending balance (mirrors VENDOR_PENDING CREDIT above)
      await creditVendorPendingBalance(
        breakdown.vendorId.toString(),
        breakdown.settleAmount,
        session,
      );

      // Credit the platform's commission balance (mirrors PLATFORM_REVENUE_COMMISSION CREDIT above)
      await creditPlatformCommission(breakdown.commission, session);
    }
  }

  async updateOrderRecordToFailureState({
    orderId,
    session,
    transactionDataStatus,
  }: {
    orderId: UpdateOrderRecordProps["orderId"];
    session: UpdateOrderRecordProps["session"];
    transactionDataStatus: FlutterwaveTransactionData["status"];
  }): Promise<{
    ok: boolean;
    error?: string;
    status?: PaymentStatus;
  }> {
    const failedStatusArr = [PaymentStatus.Failed, PaymentStatus.Cancelled];

    const order = await this.Order.findById(
      new mongoose.Types.ObjectId(orderId),
    )
      .session(session)
      .select("paymentStatus");

    if (!order) {
      return { ok: false, error: "Order not found" };
    }

    if (failedStatusArr.includes(order.paymentStatus)) {
      return { ok: true, status: order.paymentStatus };
    }

    if (transactionDataStatus.toLowerCase() === "failed") {
      order.paymentStatus = PaymentStatus.Failed;
    } else {
      order.paymentStatus = PaymentStatus.Cancelled;
    }

    const updatedOrder = await order.save({ session });

    return { ok: true, status: updatedOrder.paymentStatus };
  }

  async handleCancelledOrder({
    tx_ref,
    session,
  }: {
    tx_ref: string;
    session: UpdateOrderRecordProps["session"];
  }): Promise<{
    ok: boolean;
    error?: string;
    status?: PaymentStatus;
  }> {
    const statusArr = [
      PaymentStatus.Paid,
      PaymentStatus.Cancelled,
      PaymentStatus.Failed,
    ];

    const order = await this.Order.findOne({
      idempotencyKey: tx_ref,
    })
      .session(session)
      .select("paymentStatus expireAt");

    if (!order) {
      return { ok: false, error: "Order not found" };
    }

    if (statusArr.includes(order.paymentStatus)) {
      return { ok: true, status: order.paymentStatus };
    }

    order.paymentStatus = PaymentStatus.Cancelled;

    const updatedOrder = await order.save({ session });
    return { ok: true, status: updatedOrder.paymentStatus };
  }
}
