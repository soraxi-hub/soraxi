import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  getPayoutRecordByFlutterwaveTransferId,
  markPayoutCompleted,
  markPayoutFailed,
} from "@/lib/db/models/payout-record.model";
import { createLedgerEntry } from "@/lib/db/models/ledger-entry.model";
import { reverseVendorPayoutDeduction } from "@/lib/db/models/vendor-wallet.model";
import {
  LedgerEntryType,
  LedgerEntryCategory,
  LedgerEntityType,
  LedgerReferenceType,
  PayoutStatus,
} from "@/enums/financial.enums";
import {
  FlutterwaveTransferWebhookStatus,
  type IFlutterwaveTransferWebhookData,
} from "@/domain/payment/gateways/flutterwave.gateway";
import { koboToNaira } from "@/lib/utils/naira";
import {
  NotificationFactory,
  PayoutCompletedEmail,
  PayoutFailedEmail,
  renderTemplate,
} from "@/domain/notification";
import { getStoreModel } from "@/lib/db/models/store.model";
import React from "react";
import { DateFormatter } from "@/lib/utils/date-formatter";

/**
 * PayoutWebhookHandler
 *
 * Handles Flutterwave transfer webhook events for Stage 6.
 * Called from the main Flutterwave webhook route when a transfer event is received.
 *
 * Two outcomes:
 * - SUCCESSFUL → PAYOUT_COMPLETED ledger entry, payout record updated
 * - FAILED → PAYOUT_FAILED ledger entry, wallet deduction reversed, vendor notified
 *
 * NOTE: This handler will eventually be merged into a full PayoutService class.
 */
export class PayoutWebhookHandler {
  /**
   * Main entry point called from the webhook route.
   *
   * Routes the transfer event to the correct handler based on status.
   *
   * @param transferData - The data object from the Flutterwave transfer webhook payload
   * @returns Object indicating success or failure with a message
   */
  static async handle(transferData: IFlutterwaveTransferWebhookData): Promise<{
    ok: boolean;
    message: string;
    status?: number;
  }> {
    await connectToDatabase();

    const { reference, status, complete_message } = transferData;

    // The reference field is our flutterwaveTransferId stored on the PayoutRecord
    if (!reference) {
      console.error(
        "[PayoutWebhookHandler] Transfer webhook missing reference field",
      );
      return {
        ok: false,
        message: "Transfer reference missing in webhook payload",
        status: 400,
      };
    }

    // Fetch the payout record linked to this Flutterwave transfer
    const payoutRecord =
      await getPayoutRecordByFlutterwaveTransferId(reference);

    if (!payoutRecord) {
      console.error(
        `[PayoutWebhookHandler] No payout record found for transfer reference: ${reference}`,
      );
      return {
        ok: false,
        message: `No payout record found for transfer reference: ${reference}`,
        status: 404,
      };
    }

    // Guard: only process payouts that are still in PROCESSING status
    // COMPLETED and FAILED are terminal states — never process twice
    if (
      payoutRecord.status === PayoutStatus.COMPLETED ||
      payoutRecord.status === PayoutStatus.FAILED
    ) {
      return {
        ok: true,
        message: `Payout already in terminal state: ${payoutRecord.status}. Skipping.`,
        status: 200,
      };
    }

    // Route to the correct handler based on Flutterwave's transfer status
    if (
      status.toLowerCase() ===
      FlutterwaveTransferWebhookStatus.SUCCESSFUL.toLowerCase()
    ) {
      return this.handleSuccess(reference, payoutRecord);
    } else {
      // Treat anything that isn't SUCCESSFUL as a failure
      // This covers FAILED and any unexpected statuses defensively
      return this.handleFailure(
        reference,
        payoutRecord,
        complete_message ?? "Transfer failed",
      );
    }
  }

  /**
   * Handles a successful transfer confirmation.
   *
   * Financial writes:
   * 1. Update Payout Record → status: COMPLETED
   * 2. Create PAYOUT_COMPLETED ledger entry
   *
   * No wallet changes — the balance was already deducted in Stage 5.
   *
   * @param reference - The Flutterwave transfer reference
   * @param payoutRecord - The payout record fetched from the database
   */
  private static async handleSuccess(
    reference: string,
    payoutRecord: Awaited<
      ReturnType<typeof getPayoutRecordByFlutterwaveTransferId>
    >,
  ): Promise<{ ok: boolean; message: string; status?: number }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // --- Update Payout Record → COMPLETED ---
      await markPayoutCompleted(reference, session);
      // NOTE: Pass session once helpers support it

      // --- PAYOUT_COMPLETED ledger entry ---
      await createLedgerEntry(
        {
          type: LedgerEntryType.DEBIT,
          category: LedgerEntryCategory.PAYOUT_COMPLETED,
          amount: payoutRecord!.amountBreakdown.netAmount,
          entityType: LedgerEntityType.VENDOR,
          entityId: payoutRecord!.vendorId,
          referenceType: LedgerReferenceType.PAYOUT,
          referenceId: payoutRecord!._id as mongoose.Types.ObjectId,
          description: `Payout of ₦${koboToNaira(payoutRecord!.amountBreakdown.netAmount).toLocaleString()} successfully transferred to ${payoutRecord!.bankDetails.accountName} (${payoutRecord!.bankDetails.accountNumber})`,
          metadata: {
            flutterwaveReference: reference,
            accountNumber: payoutRecord!.bankDetails.accountNumber,
            accountName: payoutRecord!.bankDetails.accountName,
            bankCode: payoutRecord!.bankDetails.bankCode,
          },
        },
        session,
      );

      await session.commitTransaction();

      // Notify vendor of successful payout — outside session
      await this.notifyVendorSuccess(payoutRecord!).catch((err) => {
        // Notification failure must never cause a financial rollback
        console.error(
          `[PayoutWebhookHandler] Success notification failed for payout ${(payoutRecord!._id as mongoose.Types.ObjectId).toString()}:`,
          err,
        );
      });

      return {
        ok: true,
        message: "Payout completed successfully.",
        status: 200,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("[PayoutWebhookHandler] handleSuccess failed:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handles a failed transfer.
   *
   * Financial writes:
   * 1. Update Payout Record → status: FAILED, failureReason populated
   * 2. Create PAYOUT_FAILED ledger entry
   * 3. Reverse wallet deduction — restore amount to vendor's available balance
   *
   * @param reference - The Flutterwave transfer reference
   * @param payoutRecord - The payout record fetched from the database
   * @param failureReason - Human-readable reason from Flutterwave
   */
  private static async handleFailure(
    reference: string,
    payoutRecord: Awaited<
      ReturnType<typeof getPayoutRecordByFlutterwaveTransferId>
    >,
    failureReason: string,
  ): Promise<{ ok: boolean; message: string; status?: number }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // --- Update Payout Record → FAILED ---
      await markPayoutFailed(reference, failureReason, session);
      // NOTE: Pass session once helpers support it

      // --- PAYOUT_FAILED ledger entry ---
      await createLedgerEntry(
        {
          type: LedgerEntryType.CREDIT,
          category: LedgerEntryCategory.PAYOUT_FAILED,
          amount: payoutRecord!.amountBreakdown.requestedAmount,
          entityType: LedgerEntityType.VENDOR,
          entityId: payoutRecord!.vendorId,
          referenceType: LedgerReferenceType.PAYOUT,
          referenceId: payoutRecord!._id as mongoose.Types.ObjectId,
          description: `Payout of ₦${koboToNaira(payoutRecord!.amountBreakdown.requestedAmount).toLocaleString()} failed after reaching Flutterwave — amount reversed to available balance`,
          metadata: {
            flutterwaveReference: reference,
            failureReason,
            accountNumber: payoutRecord!.bankDetails.accountNumber,
            accountName: payoutRecord!.bankDetails.accountName,
          },
        },
        session,
      );

      // 3. Reverse processing fee (platform revenue rollback)
      if (payoutRecord!.amountBreakdown.processingFee > 0) {
        await createLedgerEntry(
          {
            type: LedgerEntryType.DEBIT,
            category: LedgerEntryCategory.COMMISSION_DEDUCTED,
            amount: payoutRecord!.amountBreakdown.processingFee,
            entityType: LedgerEntityType.PLATFORM,
            entityId: payoutRecord!.vendorId,
            referenceType: LedgerReferenceType.PAYOUT,
            referenceId: payoutRecord!._id as mongoose.Types.ObjectId,
            description: "Reversal of processing fee due to payout failure",
            metadata: { failureReason, reversal: true },
          },
          session,
        );
      }

      // 4. Reverse gateway fee (platform expense rollback)
      if (payoutRecord!.amountBreakdown.gatewayFee) {
        await createLedgerEntry(
          {
            type: LedgerEntryType.CREDIT,
            category: LedgerEntryCategory.GATEWAY_FEE_DEDUCTED,
            amount: payoutRecord!.amountBreakdown.gatewayFee,
            entityType: LedgerEntityType.PLATFORM,
            entityId: payoutRecord!.vendorId,
            referenceType: LedgerReferenceType.PAYOUT,
            referenceId: payoutRecord!._id as mongoose.Types.ObjectId,
            description: "Reversal of gateway fee due to payout failure",
            metadata: { failureReason, reversal: true },
          },
          session,
        );
      }

      // --- Reverse wallet deduction — restore amount to available balance ---
      // The amount deducted in Stage 5 is returned since the transfer failed
      await reverseVendorPayoutDeduction(
        payoutRecord!.vendorId.toString(),
        payoutRecord!.amountBreakdown.netAmount,
        session,
      );

      await session.commitTransaction();

      // Notify vendor of failure — outside session
      await this.notifyVendorFailure(payoutRecord!, failureReason).catch(
        (err) => {
          console.error(
            `[PayoutWebhookHandler] Failure notification failed for payout ${(payoutRecord!._id as mongoose.Types.ObjectId).toString()}:`,
            err,
          );
        },
      );

      return {
        ok: true,
        message: "Payout failure handled. Wallet deduction reversed.",
        status: 200,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error("[PayoutWebhookHandler] handleFailure failed:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Notifies the vendor that their payout was successfully transferred.
   * Fire-and-forget — called outside the session after commit.
   *
   * NOTE: Implement the PayoutCompletedEmail template and uncomment below.
   *
   * @param payoutRecord - The completed payout record
   */
  private static async notifyVendorSuccess(
    payoutRecord: NonNullable<
      Awaited<ReturnType<typeof getPayoutRecordByFlutterwaveTransferId>>
    >,
  ): Promise<void> {
    const Store = await getStoreModel();
    const store = await Store.findById(payoutRecord.vendorId).select(
      "storeEmail name",
    );

    if (!store) return;

    const html = await renderTemplate(
      React.createElement(PayoutCompletedEmail, {
        storeName: store.name,
        settlementDate: DateFormatter.dateTime(payoutRecord.createdAt),
        flutterwaveTransferId: payoutRecord.flutterwaveTransferId,
        bankDetails: payoutRecord.bankDetails,
        amountBreakdown: payoutRecord.amountBreakdown,
      }),
    );

    const notification = NotificationFactory.create("email", {
      recipient: store.storeEmail,
      subject: "Your payout has been processed",
      emailType: "noreply",
      fromAddress: "noreply@soraxihub.com",
      html,
      text: `Your payout of ₦${koboToNaira(payoutRecord.amountBreakdown.netAmount).toLocaleString()} has been successfully transferred.`,
    });

    await notification.send();

    console.log(
      `[PayoutWebhookHandler] TODO: Send success notification for payout ${(payoutRecord._id as mongoose.Types.ObjectId).toString()}`,
    );
  }

  /**
   * Notifies the vendor that their payout failed and their balance has been restored.
   * Fire-and-forget — called outside the session after commit.
   *
   * NOTE: Implement the PayoutFailedEmail template and uncomment below.
   *
   * @param payoutRecord - The failed payout record
   * @param failureReason - Human-readable reason from Flutterwave
   */
  private static async notifyVendorFailure(
    payoutRecord: NonNullable<
      Awaited<ReturnType<typeof getPayoutRecordByFlutterwaveTransferId>>
    >,
    failureReason: string,
  ): Promise<void> {
    // NOTE: Fetch store email and send failure notification:
    const Store = await getStoreModel();
    const store = await Store.findById(payoutRecord.vendorId).select(
      "storeEmail name",
    );

    if (!store) return;

    const html = await renderTemplate(
      React.createElement(PayoutFailedEmail, {
        storeName: store.name,
        bankDetails: payoutRecord.bankDetails,
        amountBreakdown: payoutRecord.amountBreakdown,

        payoutReference: payoutRecord.flutterwaveTransferId,
      }),
    );
    const notification = NotificationFactory.create("email", {
      recipient: store.storeEmail,
      subject: "Payout failed — your balance has been restored",
      emailType: "noreply",
      fromAddress: "noreply@soraxihub.com",
      html,
      text: `Your payout of ₦${koboToNaira(payoutRecord.amountBreakdown.netAmount).toLocaleString()} failed. Your balance has been restored. Reason: ${failureReason}`,
    });
    await notification.send();
    console.log(
      `[PayoutWebhookHandler] TODO: Send failure notification for payout ${(payoutRecord._id as mongoose.Types.ObjectId).toString()}`,
    );
  }
}
