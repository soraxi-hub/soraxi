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
import { createLedgerEntry } from "@/lib/db/models/ledger-entry.model";
import { creditVendorPendingBalance } from "@/lib/db/models/vendor-wallet.model";
import { creditPlatformCommission } from "@/lib/db/models/platform-wallet.model";
import {
  LedgerEntryType,
  LedgerEntryCategory,
  LedgerEntityType,
  LedgerReferenceType,
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
  private PLATFORM_ENTITY_ID = new mongoose.Types.ObjectId(
    process.env.PLATFORM_ENTITY_ID,
  );

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
    const transactionRecord = await createTransactionRecord(
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
    // NOTE: Pass session into createTransactionRecord once helpers support it

    // ----------------------------------------------------------------
    // STEP 3: Per suborder — create ledger entries and update wallets
    // ----------------------------------------------------------------
    for (const breakdown of suborderBreakdowns) {
      const sharedRef = {
        referenceType: LedgerReferenceType.SUBORDER,
        referenceId: breakdown.suborderId,
      };

      // --- PAYMENT_RECEIVED ---
      // Platform acknowledges receiving the full gross amount from the customer
      await createLedgerEntry(
        {
          type: LedgerEntryType.CREDIT,
          category: LedgerEntryCategory.PAYMENT_RECEIVED,
          amount: breakdown.grossAmount,
          entityType: LedgerEntityType.PLATFORM,
          entityId: this.PLATFORM_ENTITY_ID,
          ...sharedRef,
          description: `Payment received for suborder ${breakdown.suborderId}`,
          metadata: { flutterwaveReference, orderId: order._id },
        },
        session,
      );

      // --- COMMISSION_DEDUCTED ---
      // Platform's cut is recorded as earned revenue
      await createLedgerEntry(
        {
          type: LedgerEntryType.CREDIT,
          category: LedgerEntryCategory.COMMISSION_DEDUCTED,
          amount: breakdown.commission,
          entityType: LedgerEntityType.PLATFORM,
          entityId: this.PLATFORM_ENTITY_ID,
          ...sharedRef,
          description: `Commission deducted for suborder ${breakdown.suborderId}`,
          metadata: {
            percentageFee: breakdown.commissionDetails.percentageFee,
            flatFeeApplied: breakdown.commissionDetails.flatFeeApplied,
          },
        },
        session,
      );

      // --- VENDOR_SETTLEMENT ---
      // Vendor's net settle amount is credited to their pending balance
      await createLedgerEntry(
        {
          type: LedgerEntryType.CREDIT,
          category: LedgerEntryCategory.VENDOR_SETTLEMENT,
          amount: breakdown.settleAmount,
          entityType: LedgerEntityType.VENDOR,
          entityId: breakdown.vendorId,
          ...sharedRef,
          description: `Settlement pending for suborder ${breakdown.suborderId}`,
          metadata: { transactionRecordId: transactionRecord._id },
        },
        session,
      );

      // --- Update Vendor Wallet: credit pending balance ---
      await creditVendorPendingBalance(
        breakdown.vendorId.toString(),
        breakdown.settleAmount,
        session,
        // NOTE: Pass session once helpers support it
      );

      // --- Update Platform Wallet: credit commission balance ---
      await creditPlatformCommission(
        breakdown.commission,
        session,
        // NOTE: Pass session once helpers support it
      );
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
