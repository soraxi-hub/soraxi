import { PaymentGateway, PaymentStatus } from "@/enums";
import {
  getOrderModel,
  IOrderDocument,
  type IOrder,
} from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import mongoose, { type Model } from "mongoose";
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
  LedgerEntityType,
  SuborderFinancialStatus,
} from "@/enums/financial.enums";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

type CustomerInfo = {
  fullName: string;
  email: string;
};

type UpdateOrderRecordProps = {
  orderId: string;
  idempotencyKey: string;
  transactionId: number;
  session: mongoose.ClientSession | null;
  paymentMethod: string;
  customerInfo: CustomerInfo;
  collectionFeeKobo: number;
  /** Which gateway verified this payment — cross-checked against the order record. */
  provider: PaymentGateway;
  /** Amount the gateway confirmed was charged, in Kobo. */
  amountPaidKobo: number;
  /** Currency the gateway confirmed, e.g. "NGN". */
  currency: string;
};

/**
 * Validate that what the gateway says was charged actually covers the order.
 *
 * Verification trusting the status alone is not enough: with bank-transfer
 * flows a customer can underpay and the gateway may still emit a webhook.
 * Overpayment is tolerated (never blocks fulfilment); underpayment or a
 * currency mismatch must stop the order from being marked Paid.
 *
 * Pure function, exported for unit testing.
 */
export function validateChargedAmount({
  expectedKobo,
  chargedKobo,
  currency,
}: {
  expectedKobo: number;
  chargedKobo: number;
  currency: string;
}): { ok: true } | { ok: false; reason: string } {
  if (currency !== "NGN") {
    return {
      ok: false,
      reason: `Unexpected currency "${currency}" — expected NGN.`,
    };
  }
  if (chargedKobo < expectedKobo) {
    return {
      ok: false,
      reason:
        `Underpayment: gateway confirmed ${chargedKobo} Kobo but the order ` +
        `total is ${expectedKobo} Kobo.`,
    };
  }
  return { ok: true };
}

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
    transactionId,
    session,
    paymentMethod,
    customerInfo,
    collectionFeeKobo,
    provider,
    amountPaidKobo,
    currency,
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

    // ── Provider guard ───────────────────────────────────────────────────
    // The order record names the gateway that issued the payment link. A
    // verification arriving from a different provider means a mismatched or
    // manipulated callback — never mark the order paid from it.
    if (order.paymentGateway && order.paymentGateway !== provider) {
      const error =
        `Gateway mismatch for order ${orderId}: order was initiated on ` +
        `"${order.paymentGateway}" but verification came from "${provider}".`;
      console.error(error);
      await this.alertAdminOfSuspiciousPayment(error);
      return { ok: false, error };
    }

    // ── Amount guard ─────────────────────────────────────────────────────
    // The gateway's verified status alone is not proof the order was covered
    // (bank-transfer underpayment still fires a webhook). Validate the
    // charged amount against the order total before marking anything paid.
    const amountCheck = validateChargedAmount({
      expectedKobo: order.totalAmount,
      chargedKobo: amountPaidKobo,
      currency,
    });

    if (!amountCheck.ok) {
      const error = `Payment rejected for order ${orderId}: ${amountCheck.reason}`;
      console.error(error);
      await this.alertAdminOfSuspiciousPayment(error);
      return { ok: false, error };
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

        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "service:process-order.redeemCoupon",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }

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
        transactionId,
        session,
        collectionFeeKobo,
        provider,
      );
    } catch (error) {
      console.error(
        "Critical financial processing failure for order:",
        order._id,
        error,
      );
      // NOTE: Same principle applies — don't fail the order.
      // Flag for admin review and retry queue (covered in Layer 4: Background Jobs)
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, {
              source: "service:process-order.processPaymentConfirmedFinancials",
            }),
          );
        } catch {
          // sendTelegramMessage already console.errors internally; never mask the original error
        }
      }
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

  /**
   * Alert the platform team about a payment that verified "successful" but
   * failed a safety guard (underpayment, currency or gateway mismatch).
   * These need a human decision — refund, manual reconciliation, or fraud
   * follow-up — so the order is deliberately left unpaid.
   */
  private async alertAdminOfSuspiciousPayment(detail: string): Promise<void> {
    try {
      await sendTelegramMessage(
        `Suspicious payment blocked\n${detail}\nOrder was NOT marked paid — manual review required.`,
      );
    } catch {
      // The alert is best-effort; the block itself already happened.
    }
  }

  private async processPaymentConfirmedFinancials(
    order: IOrder,
    flutterwaveReference: string,
    flutterwaveTransactionId: number,
    session: mongoose.ClientSession | null,
    collectionFeeKobo: number,
    provider: PaymentGateway,
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
        subOrder.financials.subtotal,
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
        grossAmount: subOrder.financials.subtotal,
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
        paymentProvider: provider,
        gatewayTransactionId: String(flutterwaveTransactionId),
        flutterwaveReference,
        flutterwaveTransactionId,
        flutterwaveStatus: FlutterwavePaymentStatus.SUCCESSFUL,
        totalAmount: order.totalAmount,
        suborderBreakdowns,
      },
      session,
    );

    // ----------------------------------------------------------------
    // STEP 3: Write journal entries via the double-entry writer
    //
    // PAYMENT_RECEIVED records the full gross entering escrow in one movement.
    // Each suborder is then settled with its own balanced entry, so referenceId
    // points at the suborder and per-suborder commission stays derivable from
    // the ledger. Summed, the settlement DEBITs close exactly the REFUND_PAYABLE
    // that PAYMENT_RECEIVED opened.
    // ----------------------------------------------------------------
    const writer = await JournalEntryWriter.init();

    // --- PAYMENT_RECEIVED ---
    // DEBIT PLATFORM_ESCROW / CREDIT CUSTOMER_REFUND_PAYABLE
    await writer.writePaymentReceived({
      totalAmount: order.totalAmount,
      orderId: order._id,
      entityId: order.userId,
      entityType: LedgerEntityType.CUSTOMER,
      flutterwaveReference,
      session,
    });

    // --- Per-suborder settlement + wallet credit (single pass) ---
    // Each entry: DEBIT CUSTOMER_REFUND_PAYABLE / CREDIT VENDOR_PENDING + PLATFORM_REVENUE_COMMISSION
    let totalCommission = 0;

    for (const breakdown of suborderBreakdowns) {
      await writer.writeSuborderSettlement({
        vendorId: breakdown.vendorId,
        customerId: order.userId,
        settleAmount: breakdown.settleAmount,
        commission: breakdown.commission,
        amountPaid: breakdown.grossAmount,
        suborderId: breakdown.suborderId,
        session,
      });

      // Mirror the VENDOR_PENDING credit into the wallet running-state cache
      await creditVendorPendingBalance(
        breakdown.vendorId.toString(),
        breakdown.settleAmount,
        session,
      );

      totalCommission += breakdown.commission;
    }

    // --- COLLECTION_FEE ---
    // Flutterwave's fee reduces PLATFORM_ESCROW and records a gateway expense.
    // DEBIT GATEWAY_FEES_EXPENSE / CREDIT PLATFORM_ESCROW
    if (collectionFeeKobo > 0) {
      await writer.writeCollectionFee({
        feeAmount: collectionFeeKobo,
        orderId: order._id,
        session,
      });
    }

    // Mirror the PLATFORM_REVENUE_COMMISSION credit into the platform wallet cache
    await creditPlatformCommission(totalCommission, session);
  }

  async updateOrderRecordToFailureState({
    orderId,
    session,
    transactionDataStatus,
  }: {
    orderId: UpdateOrderRecordProps["orderId"];
    session: UpdateOrderRecordProps["session"];
    /** The gateway's raw status string, lowercased ("failed", "cancelled", …). */
    transactionDataStatus: string;
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
