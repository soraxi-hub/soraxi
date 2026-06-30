import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  RefundStatus,
  RefundTrigger,
  SuborderFinancialStatus,
} from "@/enums/financial.enums";
import {
  createRefundRecord,
  getRefundRecordByFlutterwaveRefundId,
  markRefundCompleted,
  markRefundFailed,
  IRefundRecordDocument,
} from "@/lib/db/models/refund-record.model";
import { getVendorWalletModel } from "@/lib/db/models/vendor-wallet.model";
import { formatNaira, koboToNaira } from "@/lib/utils/naira";
import {
  NotificationFactory,
  RefundIssuedEmail,
  renderTemplate,
} from "@/domain/notification";
import { getUserModel } from "@/lib/db/models/user.model";
import React from "react";
import { debitPlatformCommission } from "@/lib/db/models/platform-wallet.model";

// ---------------------------------------------------------------------------
// Flutterwave Refund Client
// ---------------------------------------------------------------------------

/**
 * Response from Flutterwave's POST /v3/transactions/:id/refund endpoint.
 */
interface IFlutterwaveRefundResponse {
  status: "success" | "error";
  message: string;
  data: {
    id: number; // Flutterwave refund ID — stored as flutterwaveRefundId
    amount_refunded: number;
    status: string; // "completed", "processing", "pending-momo", etc.
    destination: string;
    created_at: string;
  } | null;
}

/**
 * Handles communication with Flutterwave's Refund API.
 * Separated from the transfer client — refunds and payouts are distinct operations.
 */
class FlutterwaveRefundClient {
  private readonly apiUrl: string;
  private readonly secretKey: string;
  private readonly maxRetries = 3;
  private readonly baseDelay = 500;

  constructor() {
    this.apiUrl =
      process.env.FLUTTERWAVE_API_URL || "https://api.flutterwave.com/v3";
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY ?? "";

    if (!this.secretKey) {
      throw new Error(
        "Server configuration error: missing Flutterwave secret key",
      );
    }
  }

  /**
   * Call Flutterwave's refund endpoint for a given transaction.
   * Supports partial refunds via the `amount` field.
   * Includes retry logic with exponential backoff.
   *
   * @param flutterwaveTransactionId - The original Flutterwave transaction ID
   * @param amountInNaira - Amount to refund in Naira (Flutterwave works in Naira)
   * @param comments - Human-readable reason shown in Flutterwave dashboard
   * @returns Flutterwave refund response or null on failure
   */
  async initiateRefund(
    flutterwaveTransactionId: string,
    amountInNaira: number,
    comments: string,
  ): Promise<IFlutterwaveRefundResponse | null> {
    const url = `${this.apiUrl}/transactions/${flutterwaveTransactionId}/refund`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInNaira,
            comments,
          }),
        });

        const data: IFlutterwaveRefundResponse = await response.json();

        if (!response.ok || data.status !== "success") {
          console.error(
            `[FlutterwaveRefundClient] Attempt ${attempt}: Refund failed — ${data.message}`,
          );
          if (attempt === this.maxRetries) return null;
        } else {
          return data;
        }
      } catch (error) {
        console.error(
          `[FlutterwaveRefundClient] Attempt ${attempt}: Network error —`,
          error,
        );
        if (attempt === this.maxRetries) return null;
      }

      const delay = this.baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Input shared by all automated refund trigger methods.
 */
export interface IProcessRefundInput {
  suborderId: string;
  orderId: string;
  vendorId: string;
  customerId: string;
  /** Vendor's net settle amount for this suborder, in Kobo. */
  settleAmount: number;
  /** Platform commission on this suborder, in Kobo. */
  commission: number;
  /**
   * The Flutterwave transaction ID from the original payment.
   * Retrieved from TransactionRecord.flutterwaveReference.
   */
  flutterwaveTransactionId: string;
  session: mongoose.ClientSession;
}

/**
 * Additional input for dispute-triggered refunds.
 */
export interface IProcessDisputeRefundInput extends IProcessRefundInput {
  disputeId: string;
}

/**
 * Input for the manual admin confirmation path.
 */
export interface IConfirmManualRefundInput {
  refundRecord: IRefundRecordDocument;
  /**
   * The Flutterwave refund ID the admin copies from the dashboard
   * after executing the refund manually.
   */
  flutterwaveRefundId: string;
}

// ---------------------------------------------------------------------------
// RefundService
// ---------------------------------------------------------------------------

/**
 * RefundService
 *
 * Owns all refund logic — both automated (Flutterwave API) and manual
 * (admin-driven). Keeping everything here mirrors the PayoutProcessingService
 * pattern and ensures one place to look when the refund flow changes.
 *
 * Automated flow:
 *   Triggered by order status transitions (Canceled, FailedDelivery) or
 *   dispute resolution (upheld, auto-resolved). Calls Flutterwave's refund
 *   API directly. Flutterwave posts confirmation back via webhook.
 *
 * Manual flow (active while Vercel IP whitelisting prevents automated calls):
 *   RefundRecord is created and stays INITIATED. Admin sees it in the admin
 *   panel, executes the refund on the Flutterwave dashboard, then calls
 *   confirmManualRefund to record the outcome.
 *
 * Webhook flow:
 *   handleRefundWebhook is called from the Flutterwave webhook route when a
 *   refund event arrives. Writes writeRefundConfirmed and marks the record
 *   COMPLETED or FAILED.
 */
export class RefundService {
  // -------------------------------------------------------------------------
  // PUBLIC: Automated trigger — order cancellation
  // -------------------------------------------------------------------------

  /**
   * Process a refund triggered by a vendor cancelling an order.
   *
   * Cancellation is only possible from OrderPlaced or Processing, so funds
   * are guaranteed to be in VENDOR_PENDING. The full amountPaid is refunded
   * to the student (settle + commission reversed).
   *
   * Writes: writeOrderCancellationRefund
   * Then:   calls Flutterwave refund API (automated path)
   *
   * @param input - Refund input including suborder financial details
   */
  static async processOrderCancellationRefund(
    input: IProcessRefundInput,
  ): Promise<void> {
    const {
      suborderId,
      orderId,
      vendorId,
      customerId,
      settleAmount,
      commission,
      flutterwaveTransactionId,
      session,
    } = input;

    const amountPaid = settleAmount + commission;
    const refundId = new mongoose.Types.ObjectId();
    const writer = await JournalEntryWriter.init();

    // 1. Write cancellation refund journal entry
    await writer.writeOrderCancellationRefund({
      vendorId: new mongoose.Types.ObjectId(vendorId),
      settleAmount,
      commission,
      amountPaid,
      refundId,
      suborderId: new mongoose.Types.ObjectId(suborderId),
      session,
    });

    // 1b. Reverse platform wallet commission cache — mirrors the
    // PLATFORM_REVENUE_COMMISSION DEBIT in writeOrderCancellationRefund.
    // The sale never completed, so the commission earned is given back.
    await debitPlatformCommission(commission, session);

    // 2. Update vendor wallet cache — subtract settleAmount from pending and total
    await this.deductVendorPendingForRefund(vendorId, settleAmount, session);

    // 3. Update TransactionRecord suborder status → REFUNDED
    await this.markSuborderRefunded(orderId, suborderId, session);

    // 4. Create RefundRecord in INITIATED state
    const refundRecord = await createRefundRecord(
      {
        _id: refundId,
        suborderId: new mongoose.Types.ObjectId(suborderId),
        orderId: new mongoose.Types.ObjectId(orderId),
        vendorId: new mongoose.Types.ObjectId(vendorId),
        customerId: new mongoose.Types.ObjectId(customerId),
        trigger: RefundTrigger.ORDER_CANCELLED,
        amountBreakdown: {
          amountRefunded: amountPaid,
          settleAmount,
          commission,
        },
        flutterwaveTransactionId,
        status: RefundStatus.INITIATED,
        ledgerEntryId: refundId, // Same ObjectId — journal entry referenceId
      },
      session,
    );

    // 5. Call Flutterwave refund API outside the session — network calls
    //    must not run inside a MongoDB transaction
    await this.callFlutterwaveRefund(
      refundRecord,
      amountPaid,
      "Order cancelled by vendor",
    );
  }

  // -------------------------------------------------------------------------
  // PUBLIC: Automated trigger — failed delivery
  // -------------------------------------------------------------------------

  /**
   * Process a refund triggered by a vendor marking a delivery as failed.
   *
   * FailedDelivery fires at OutForDelivery stage — funds are still in
   * VENDOR_PENDING (delivery confirmation has not happened yet).
   * Only the settleAmount is refunded; commission is kept by Soraxi.
   *
   * Writes: writeFailedDeliveryRefund
   * Then:   calls Flutterwave refund API (automated path)
   *
   * @param input - Refund input including suborder financial details
   */
  static async processFailedDeliveryRefund(
    input: IProcessRefundInput,
  ): Promise<void> {
    const {
      suborderId,
      orderId,
      vendorId,
      customerId,
      settleAmount,
      commission,
      flutterwaveTransactionId,
      session,
    } = input;

    const refundId = new mongoose.Types.ObjectId();
    const writer = await JournalEntryWriter.init();

    // 1. Write failed delivery refund journal entry
    await writer.writeFailedDeliveryRefund({
      vendorId: new mongoose.Types.ObjectId(vendorId),
      settleAmount,
      refundId,
      suborderId: new mongoose.Types.ObjectId(suborderId),
      session,
    });

    // 2. Update vendor wallet cache — subtract settleAmount from pending and total
    await this.deductVendorPendingForRefund(vendorId, settleAmount, session);

    // 3. Update TransactionRecord suborder status → REFUNDED
    await this.markSuborderRefunded(orderId, suborderId, session);

    // 4. Create RefundRecord in INITIATED state
    const refundRecord = await createRefundRecord(
      {
        _id: refundId,
        suborderId: new mongoose.Types.ObjectId(suborderId),
        orderId: new mongoose.Types.ObjectId(orderId),
        vendorId: new mongoose.Types.ObjectId(vendorId),
        customerId: new mongoose.Types.ObjectId(customerId),
        trigger: RefundTrigger.FAILED_DELIVERY,
        amountBreakdown: {
          amountRefunded: settleAmount,
          settleAmount,
          commission,
        },
        flutterwaveTransactionId,
        status: RefundStatus.INITIATED,
        ledgerEntryId: refundId,
      },
      session,
    );

    // 5. Call Flutterwave refund API outside the session
    await this.callFlutterwaveRefund(
      refundRecord,
      settleAmount,
      "Delivery failed — vendor unable to complete delivery",
    );
  }

  // -------------------------------------------------------------------------
  // PUBLIC: Automated trigger — dispute upheld / auto-resolved
  // -------------------------------------------------------------------------

  /**
   * Process a refund triggered by an upheld or auto-resolved dispute.
   *
   * Called AFTER the dispute journal entries (writeDisputeUpheld or
   * writeDisputeAutoResolved) have already been written by the dispute
   * resolution service. Those entries have already credited CUSTOMER_REFUND_PAYABLE
   * with the full amountPaid. This method only creates the RefundRecord and
   * calls Flutterwave — it does NOT write additional journal entries for the
   * liability itself.
   *
   * The wallet cache deduction for the vendor's disputed funds was already
   * handled by the dispute resolution service via applyDisputeUpheldDeductions
   * or equivalent. This method does not touch the vendor wallet.
   *
   * Writes: nothing to the ledger (already written by dispute service)
   * Then:   calls Flutterwave refund API (automated path)
   *
   * @param input - Dispute refund input
   */
  static async processDisputeRefund(
    input: IProcessDisputeRefundInput,
  ): Promise<void> {
    const {
      suborderId,
      orderId,
      vendorId,
      customerId,
      settleAmount,
      commission,
      flutterwaveTransactionId,
      session,
    } = input;

    const amountPaid = settleAmount + commission;
    const refundId = new mongoose.Types.ObjectId();

    // Create RefundRecord — ledger entries already written by dispute service
    const refundRecord = await createRefundRecord(
      {
        _id: refundId,
        suborderId: new mongoose.Types.ObjectId(suborderId),
        orderId: new mongoose.Types.ObjectId(orderId),
        vendorId: new mongoose.Types.ObjectId(vendorId),
        customerId: new mongoose.Types.ObjectId(customerId),
        trigger: RefundTrigger.DISPUTE_UPHELD,
        amountBreakdown: {
          amountRefunded: amountPaid,
          settleAmount,
          commission,
        },
        flutterwaveTransactionId,
        status: RefundStatus.INITIATED,
        ledgerEntryId: refundId,
      },
      session,
    );

    // Call Flutterwave refund API outside the session
    await this.callFlutterwaveRefund(
      refundRecord,
      amountPaid,
      "Dispute upheld — full refund issued to customer",
    );
  }

  // -------------------------------------------------------------------------
  // PUBLIC: Manual admin confirmation path
  // -------------------------------------------------------------------------

  /**
   * Record the outcome of a refund that was executed manually via the
   * Flutterwave dashboard.
   *
   * Called from the admin procedures mutation after the admin:
   * 1. Sees the INITIATED RefundRecord in the admin panel
   * 2. Executes the refund on the Flutterwave dashboard
   * 3. Pastes the Flutterwave refund ID back
   *
   * Writes: writeRefundConfirmed (closes CUSTOMER_REFUND_PAYABLE liability)
   * Then:   marks RefundRecord as COMPLETED and notifies the customer
   *
   * @param input - Manual refund confirmation input
   */
  static async confirmManualRefund(
    input: IConfirmManualRefundInput,
  ): Promise<{ message: string }> {
    const { refundRecord, flutterwaveRefundId } = input;

    const refundObjectId = refundRecord._id as mongoose.Types.ObjectId;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const writer = await JournalEntryWriter.init();

      // Close the CUSTOMER_REFUND_PAYABLE liability
      //   DEBIT   CUSTOMER_REFUND_PAYABLE   amountRefunded
      //   CREDIT  PLATFORM_ESCROW           amountRefunded
      await writer.writeRefundConfirmed({
        amountRefunded: refundRecord.amountBreakdown.amountRefunded,
        refundId: refundObjectId,
        session,
      });

      // Mark RefundRecord as COMPLETED
      await markRefundCompleted(
        refundObjectId.toString(),
        flutterwaveRefundId,
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Notify customer outside the session
    await this.notifyCustomerRefundIssued(refundRecord).catch((err) => {
      console.error(
        `[RefundService] Customer notification failed for refund ${refundObjectId.toString()}:`,
        err,
      );
    });

    return {
      message: "Refund confirmed. Customer has been notified.",
    };
  }

  // -------------------------------------------------------------------------
  // PUBLIC: Webhook handler
  // -------------------------------------------------------------------------

  /**
   * Handle a Flutterwave refund webhook event.
   *
   * Called from the main Flutterwave webhook route when a refund event arrives.
   * Routes to success or failure handling based on the refund status.
   *
   * Note: Flutterwave does not send refund webhooks by default — you must
   * request enablement from Flutterwave support. Until enabled, the manual
   * admin path is the only way to close a refund.
   *
   * @param refundData - The refund data from the Flutterwave webhook payload
   */
  static async handleRefundWebhook(refundData: {
    id: number;
    status: string;
    AmountRefunded: number;
    FlwRef: string;
  }): Promise<{ ok: boolean; message: string; status?: number }> {
    await connectToDatabase();

    const flutterwaveRefundId = refundData.id.toString();

    const refundRecord =
      await getRefundRecordByFlutterwaveRefundId(flutterwaveRefundId);

    if (!refundRecord) {
      console.error(
        `[RefundService] No refund record found for Flutterwave refund ID: ${flutterwaveRefundId}`,
      );
      return {
        ok: false,
        message: `No refund record found for Flutterwave refund ID: ${flutterwaveRefundId}`,
        status: 404,
      };
    }

    // Guard: terminal states are immutable
    if (
      refundRecord.status === RefundStatus.COMPLETED ||
      refundRecord.status === RefundStatus.FAILED
    ) {
      return {
        ok: true,
        message: `Refund already in terminal state: ${refundRecord.status}. Skipping.`,
        status: 200,
      };
    }

    const isSuccess = refundData.status.toLowerCase().startsWith("completed");

    if (isSuccess) {
      return this.handleWebhookSuccess(refundRecord, flutterwaveRefundId);
    } else {
      return this.handleWebhookFailure(
        refundRecord,
        `Flutterwave refund status: ${refundData.status}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // PRIVATE: Webhook outcome handlers
  // -------------------------------------------------------------------------

  private static async handleWebhookSuccess(
    refundRecord: IRefundRecordDocument,
    flutterwaveRefundId: string,
  ): Promise<{ ok: boolean; message: string; status?: number }> {
    const refundObjectId = refundRecord._id as mongoose.Types.ObjectId;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const writer = await JournalEntryWriter.init();

      // Close CUSTOMER_REFUND_PAYABLE liability
      await writer.writeRefundConfirmed({
        amountRefunded: refundRecord.amountBreakdown.amountRefunded,
        refundId: refundObjectId,
        session,
      });

      await markRefundCompleted(
        refundObjectId.toString(),
        flutterwaveRefundId,
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error("[RefundService] handleWebhookSuccess failed:", error);
      throw error;
    } finally {
      session.endSession();
    }

    // Notify customer outside the session
    await this.notifyCustomerRefundIssued(refundRecord).catch((err) => {
      console.error(
        `[RefundService] Customer notification failed for refund ${refundObjectId.toString()}:`,
        err,
      );
    });

    return { ok: true, message: "Refund confirmed successfully.", status: 200 };
  }

  private static async handleWebhookFailure(
    refundRecord: IRefundRecordDocument,
    failureReason: string,
  ): Promise<{ ok: boolean; message: string; status?: number }> {
    const refundObjectId = refundRecord._id as mongoose.Types.ObjectId;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await markRefundFailed(refundObjectId.toString(), failureReason, session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error("[RefundService] handleWebhookFailure failed:", error);
      throw error;
    } finally {
      session.endSession();
    }

    console.error(
      `[RefundService] Refund ${refundObjectId.toString()} failed — reason: ${failureReason}. Manual intervention required.`,
    );

    // NOTE: Send admin alert here — a failed refund needs manual follow-up

    return {
      ok: true,
      message: "Refund failure recorded. Manual intervention required.",
      status: 200,
    };
  }

  // -------------------------------------------------------------------------
  // PRIVATE: Flutterwave API call (automated path)
  // -------------------------------------------------------------------------

  /**
   * Call Flutterwave's refund API and update the RefundRecord with the result.
   *
   * Run OUTSIDE the MongoDB session — network calls must not run inside
   * a MongoDB transaction. The RefundRecord is already committed to INITIATED
   * before this is called.
   *
   * On success: stores the Flutterwave refund ID on the record.
   *             writeRefundConfirmed fires later via webhook.
   * On failure: marks the record FAILED and logs for manual follow-up.
   *             The CUSTOMER_REFUND_PAYABLE liability remains open — admin
   *             must use confirmManualRefund to close it.
   *
   * @param refundRecord - The committed RefundRecord document
   * @param amountInKobo - Amount to refund in Kobo (converted internally to Naira)
   * @param comments - Reason shown in Flutterwave dashboard
   */
  private static async callFlutterwaveRefund(
    refundRecord: IRefundRecordDocument,
    amountInKobo: number,
    comments: string,
  ): Promise<void> {
    const refundId = (refundRecord._id as mongoose.Types.ObjectId).toString();

    try {
      const client = new FlutterwaveRefundClient();
      const response = await client.initiateRefund(
        refundRecord.flutterwaveTransactionId,
        koboToNaira(amountInKobo),
        comments,
      );

      if (!response || !response.data) {
        console.error(
          `[RefundService] Flutterwave refund API call failed for refund ${refundId}. ` +
            `Record stays INITIATED — admin must confirm manually.`,
        );
        // NOTE: Send admin alert here — automated refund failed, manual action needed
        return;
      }

      // Store the Flutterwave refund ID — webhook will fire writeRefundConfirmed
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const RefundRecord = await import(
          "@/lib/db/models/refund-record.model"
        ).then((m) => m.getRefundRecordModel());
        await (
          await RefundRecord
        ).findByIdAndUpdate(
          refundId,
          { $set: { flutterwaveRefundId: response.data.id.toString() } },
          { session },
        );
        await session.commitTransaction();
      } catch (err) {
        await session.abortTransaction();
        console.error(
          `[RefundService] Failed to store flutterwaveRefundId for refund ${refundId}:`,
          err,
        );
      } finally {
        session.endSession();
      }

      console.log(
        `[RefundService] Flutterwave refund initiated for refund ${refundId} — ` +
          `Flutterwave refund ID: ${response.data.id}. Awaiting webhook confirmation.`,
      );
    } catch (error) {
      console.error(
        `[RefundService] Unexpected error calling Flutterwave refund API for refund ${refundId}:`,
        error,
      );
      // NOTE: Send admin alert here
    }
  }

  // -------------------------------------------------------------------------
  // PRIVATE: Vendor wallet helper
  // -------------------------------------------------------------------------

  /**
   * Deduct the settle amount from the vendor's pending balance.
   * Called inside the session before the RefundRecord is created.
   *
   * @param vendorId - The vendor's ID
   * @param settleAmount - Amount to deduct from pending, in Kobo
   * @param session - MongoDB client session
   */
  private static async deductVendorPendingForRefund(
    vendorId: string,
    settleAmount: number,
    session: mongoose.ClientSession,
  ): Promise<void> {
    const VendorWallet = await getVendorWalletModel();

    await VendorWallet.findOneAndUpdate(
      { vendorId: new mongoose.Types.ObjectId(vendorId) },
      {
        $inc: {
          "balances.pending": -settleAmount,
          "balances.total": -settleAmount,
        },
      },
      { session },
    );
  }

  // -------------------------------------------------------------------------
  // PRIVATE: TransactionRecord status helper
  // -------------------------------------------------------------------------

  /**
   * Update the TransactionRecord suborder status to REFUNDED.
   * Scoped to the specific suborder within the order — other suborders
   * on the same order are unaffected.
   *
   * @param orderId - The parent order ID
   * @param suborderId - The specific suborder ID
   * @param session - MongoDB client session
   */
  private static async markSuborderRefunded(
    orderId: string,
    suborderId: string,
    session: mongoose.ClientSession,
  ): Promise<void> {
    // TransactionRecord stores suborderBreakdowns — find the matching entry
    // and set its status to REFUNDED.
    // NOTE: Adjust the import path and field name to match your actual
    // TransactionRecord model if it differs from this pattern.
    const { getTransactionRecordModel } = await import(
      "@/lib/db/models/transaction-record.model"
    );
    const TransactionRecord = await getTransactionRecordModel();

    await TransactionRecord.findOneAndUpdate(
      {
        orderId: new mongoose.Types.ObjectId(orderId),
        "suborderBreakdowns.suborderId": new mongoose.Types.ObjectId(
          suborderId,
        ),
      },
      {
        $set: {
          "suborderBreakdowns.$.status": SuborderFinancialStatus.REFUNDED,
        },
      },
      { session },
    );
  }

  // -------------------------------------------------------------------------
  // PRIVATE: Customer notification
  // -------------------------------------------------------------------------

  /**
   * Notify the customer that their refund has been processed.
   * Fire-and-forget — always called outside the session after commit.
   *
   * @param refundRecord - The completed refund record
   */
  private static async notifyCustomerRefundIssued(
    refundRecord: IRefundRecordDocument,
  ): Promise<void> {
    const User = await getUserModel();
    const customer = await User.findById(refundRecord.customerId).select(
      "email firstName",
    );

    if (!customer) return;

    const html = await renderTemplate(
      React.createElement(RefundIssuedEmail, {
        customerName: customer.firstName,
        amountRefunded: formatNaira(
          refundRecord.amountBreakdown.amountRefunded,
        ),
        trigger: refundRecord.trigger,
        flutterwaveRefundId: refundRecord.flutterwaveRefundId,
      }),
    );

    const notification = NotificationFactory.create("email", {
      recipient: customer.email,
      subject: "Your refund has been processed",
      emailType: "noreply",
      fromAddress: "noreply@soraxihub.com",
      html,
      text:
        `Your refund of ₦${koboToNaira(refundRecord.amountBreakdown.amountRefunded).toLocaleString()} ` +
        `has been processed and will be returned to your original payment method within 3–15 business days.`,
    });

    await notification.send();

    console.log(
      `[RefundService] Refund notification sent to customer ${refundRecord.customerId.toString()} ` +
        `for refund ${(refundRecord._id as mongoose.Types.ObjectId).toString()}`,
    );
  }
}
