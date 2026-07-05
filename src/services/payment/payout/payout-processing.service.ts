import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  getPayoutRecordModel,
  IPayoutRecordDocument,
} from "@/lib/db/models/payout-record.model";
import { updatePayoutFlutterwaveTransferId } from "@/lib/db/models/payout-record.model";
import { reverseVendorPayoutDeduction } from "@/lib/db/models/vendor-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import { PayoutStatus } from "@/enums/financial.enums";
import { koboToNaira } from "@/lib/utils/naira";
import {
  NotificationFactory,
  PayoutCompletedEmail,
  PayoutFailedEmail,
  renderTemplate,
} from "@/domain/notification";
import { getStoreModel } from "@/lib/db/models/store.model";
import { DateFormatter } from "@/lib/utils/date-formatter";
import React from "react";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

// ---------------------------------------------------------------------------
// Flutterwave Transfer Interfaces
// ---------------------------------------------------------------------------

/**
 * Payload sent to Flutterwave's /v3/transfers endpoint
 * to initiate a single bank transfer.
 */
interface IFlutterwaveTransferPayload {
  account_bank: string; // Bank code as string
  account_number: string; // Recipient account number
  amount: number; // Amount in Naira (Flutterwave works in Naira)
  narration: string; // Description shown on recipient's bank statement
  currency: string; // Always "NGN"
  reference: string; // Our unique reference — used to match webhook response
  callback_url?: string; // Optional — Flutterwave will POST transfer outcome here
  debit_currency: string; // Always "NGN"
}

/**
 * Response from Flutterwave's /v3/transfers endpoint.
 */
interface IFlutterwaveTransferResponse {
  status: "success" | "error";
  message: string;
  data: {
    id: number; // Flutterwave's internal transfer ID — stored as flutterwaveTransferId
    account_number: string;
    bank_code: string;
    full_name: string;
    amount: number;
    currency: string;
    debit_currency: string;
    narration: string;
    status: string; // "NEW", "PENDING", "SUCCESSFUL", "FAILED"
    reference: string; // Our reference echoed back
    meta: any;
    complete_message: string;
    requires_approval: number;
    is_approved: number;
    bank_name: string;
    fee: number;
    created_at: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Flutterwave Transfer Client
// ---------------------------------------------------------------------------

/**
 * Handles communication with Flutterwave's Transfer API.
 * Separated from FlutterwavePayment to keep concerns clean —
 * payment collection vs fund disbursement are distinct operations.
 *
 * NOTE: This can be merged into the FlutterwavePayment class
 * as a method if preferred — the logic is identical.
 */
class FlutterwaveTransferClient {
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
   * Initiates a single bank transfer via Flutterwave's /v3/transfers endpoint.
   * Includes retry logic with exponential backoff for network reliability.
   *
   * @param payload - Transfer details
   * @returns Flutterwave transfer response or null on failure
   */
  async initiateTransfer(
    payload: IFlutterwaveTransferPayload,
  ): Promise<IFlutterwaveTransferResponse | null> {
    const url = `${this.apiUrl}/transfers`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data: IFlutterwaveTransferResponse = await response.json();

        if (!response.ok || data.status !== "success") {
          console.error(
            `[FlutterwaveTransferClient] Attempt ${attempt}: Transfer failed — ${data.message}`,
          );

          if (attempt === this.maxRetries) return null;
        } else {
          return data;
        }
      } catch (error) {
        console.error(
          `[FlutterwaveTransferClient] Attempt ${attempt}: Network error —`,
          error,
        );
        if (attempt === this.maxRetries) return null;
      }

      // Exponential backoff before retrying
      const delay = this.baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Payout Processing Service
// ---------------------------------------------------------------------------

/**
 * Result of processing a single payout.
 */
interface IPayoutProcessingResult {
  payoutRecordId: string;
  success: boolean;
  flutterwaveTransferId?: string;
  error?: string;
}

/**
 * Summary returned after a full payout processing job run.
 */
export interface IPayoutProcessingSummary {
  processedAt: Date;
  totalInitiated: number;
  succeeded: number;
  failed: number;
  results: IPayoutProcessingResult[];
}

/**
 * Input for the manual payout confirmation flow.
 */
export interface IConfirmManualPayoutInput {
  payout: IPayoutRecordDocument;
  action: "complete" | "fail";
  /**
   * Reference copied from the Flutterwave dashboard after a successful
   * manual transfer. Required when action is "complete".
   */
  flutterwaveReference?: string;
  /**
   * Human-readable reason. Required when action is "fail".
   */
  failureReason?: string;
}

/**
 * PayoutProcessingService
 *
 * Owns all payout processing logic — both automated (cron-driven) and
 * manual (admin-driven). Keeping everything here means one place to
 * look when the payout flow changes.
 *
 * Automated flow (current short-term workaround → future default):
 *   Picks up all INITIATED PayoutRecord documents and calls
 *   Flutterwave's Transfer API for each one.
 *   Called by: Cron job — daily at 8am
 *
 * Manual flow (active while Vercel IP whitelisting is not possible):
 *   Admin executes the transfer on the Flutterwave dashboard, then
 *   calls confirmManualPayout to record the outcome and close the ledger.
 *   Called by: adminPayoutRouter.confirmManualPayout mutation
 */
export class PayoutProcessingService {
  // -------------------------------------------------------------------------
  // PUBLIC: Automated flow entry point
  // -------------------------------------------------------------------------

  /**
   * Main entry point called by the background job.
   * Fetches all INITIATED payouts and processes each independently.
   *
   * @returns Summary of the job run
   */
  static async processInitiatedPayouts(): Promise<IPayoutProcessingSummary> {
    await connectToDatabase();

    const PayoutRecord = await getPayoutRecordModel();

    // Fetch all payout records waiting to be sent to Flutterwave
    const initiatedPayouts = await PayoutRecord.find<IPayoutRecordDocument>({
      status: PayoutStatus.INITIATED,
    }).sort({ createdAt: 1 }); // Process oldest first — fair FIFO ordering

    const summary: IPayoutProcessingSummary = {
      processedAt: new Date(),
      totalInitiated: initiatedPayouts.length,
      succeeded: 0,
      failed: 0,
      results: [],
    };

    if (!initiatedPayouts.length) {
      return summary;
    }

    const transferClient = new FlutterwaveTransferClient();

    // Process each payout independently — one failure does not block others
    for (const payout of initiatedPayouts) {
      const result = await this.processSinglePayout(payout, transferClient);
      summary.results.push(result);

      if (result.success) {
        summary.succeeded++;
      } else {
        summary.failed++;
      }
    }

    // Alert admin if any payouts failed to initiate
    if (summary.failed > 0) {
      const failedIds = summary.results
        .filter((r) => !r.success)
        .map((r) => r.payoutRecordId);

      console.error(
        `[PayoutProcessingService] ${summary.failed} payout(s) failed to initiate. Payout Record IDs: ${failedIds.join(", ")}`,
      );

      // NOTE: Send admin alert email here following your NotificationFactory pattern
    }

    return summary;
  }

  // -------------------------------------------------------------------------
  // PUBLIC: Manual flow entry point
  // -------------------------------------------------------------------------

  /**
   * Records the outcome of a payout that was executed manually via the
   * Flutterwave dashboard.
   *
   * Complete path:
   *   - Stores the admin-supplied Flutterwave reference on the payout record
   *   - Writes the PAYOUT_COMPLETED journal entry
   *   - Notifies the vendor of successful transfer
   *
   * Fail path:
   *   - Marks the payout record as FAILED with a reason
   *   - Writes the PAYOUT_FAILED journal entry
   *   - Reverses the processing fee and gateway fee journal entries
   *   - Restores the vendor wallet cache (full requested amount)
   *   - Notifies the vendor that their balance has been restored
   *
   * The caller (procedure) is responsible for:
   *   - Auth and permission checks
   *
   * This method performs an atomic compare-and-set on the payout status inside
   * the transaction, so it is the authoritative INITIATED guard. The procedure
   * may keep a fast pre-check for early rejection, but this is the enforcing layer.
   *
   * @param input - Action details including the payout record and outcome
   * @returns Result message
   */
  static async confirmManualPayout(
    input: IConfirmManualPayoutInput,
  ): Promise<{ message: string }> {
    const { payout, action, flutterwaveReference, failureReason } = input;
    const payoutObjectId = payout._id as mongoose.Types.ObjectId;
    const PayoutRecord = await getPayoutRecordModel();

    // ------------------------------------------------------------------
    // COMPLETE PATH
    // ------------------------------------------------------------------
    if (action === "complete") {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const writer = await JournalEntryWriter.init();

        // Atomic compare-and-set: claim the payout only if still INITIATED.
        // A null result means a concurrent request already finalized it.
        const claimed = await PayoutRecord.findOneAndUpdate(
          { _id: payoutObjectId, status: PayoutStatus.INITIATED },
          {
            $set: {
              status: PayoutStatus.COMPLETED,
              flutterwaveTransferId: flutterwaveReference!.trim(),
            },
          },
          { session },
        );

        if (!claimed) {
          throw new Error(
            "Payout is no longer in INITIATED state — it may have been finalized by a concurrent request.",
          );
        }

        // PAYOUT_COMPLETED journal entry
        // Closes PAYOUT_PROCESSING now that the transfer is confirmed.
        //
        //   DEBIT   PLATFORM_ESCROW       netAmount
        //   DEBIT   GATEWAY_FEES_EXPENSE  gatewayFee   (if applicable)
        //   CREDIT  PAYOUT_PROCESSING     netAmount + fee
        await writer.writePayoutCompleted({
          vendorId: payout.vendorId,
          netAmount: payout.amountBreakdown.netAmount,
          gatewayFee: payout.amountBreakdown.gatewayFee ?? 0,
          payoutId: payoutObjectId,
          session,
        });

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

      // Re-fetch so the notification has the updated flutterwaveTransferId
      const updatedPayout = await PayoutRecord.findById(payoutObjectId);
      if (updatedPayout) {
        await this.notifyVendorSuccess(updatedPayout).catch(async (err) => {
          // Notification failure must never undo a committed transaction
          console.error(
            `[PayoutProcessingService] Success notification failed for payout ${payoutObjectId.toString()}:`,
            err,
          );
          if (isReportableError(err)) {
            try {
              await sendTelegramMessage(
                formatErrorReport(err, {
                  source: "service:payout-processing.notifyVendorSuccess",
                }),
              );
            } catch {
              // sendTelegramMessage already console.errors internally; never mask the original error
            }
          }
        });
      }

      return {
        message: "Payout marked as completed. Vendor has been notified.",
      };
    }

    // ------------------------------------------------------------------
    // FAIL PATH
    // ------------------------------------------------------------------
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const writer = await JournalEntryWriter.init();

      // Atomic compare-and-set: claim the payout only if still INITIATED.
      // A null result means a concurrent request already finalized it.
      const claimed = await PayoutRecord.findOneAndUpdate(
        { _id: payoutObjectId, status: PayoutStatus.INITIATED },
        {
          $set: {
            status: PayoutStatus.FAILED,
            failureReason: failureReason!.trim(),
          },
        },
        { session },
      );

      if (!claimed) {
        throw new Error(
          "Payout is no longer in INITIATED state — it may have been finalized by a concurrent request.",
        );
      }

      // PAYOUT_FAILED journal entry
      // Reverses the PAYOUT_PROCESSING debit from writePayoutInitiated.
      //
      //   DEBIT   VENDOR_AVAILABLE    netAmount
      //   CREDIT  PAYOUT_PROCESSING   netAmount
      await writer.writePayoutFailed({
        vendorId: payout.vendorId,
        requestedAmount: payout.amountBreakdown.netAmount,
        payoutId: payoutObjectId,
        session,
      });

      // Reverse processing fee
      //
      //   DEBIT   PLATFORM_REVENUE_COMMISSION   processingFee
      //   CREDIT  VENDOR_AVAILABLE              processingFee
      if (payout.amountBreakdown.processingFee > 0) {
        await writer.writePayoutProcessingFeeReversal({
          vendorId: payout.vendorId,
          processingFee: payout.amountBreakdown.processingFee,
          payoutId: payoutObjectId,
          session,
        });
      }

      // Reverse gateway fee
      // Transfer was never sent via the API so Flutterwave did not charge the fee.
      //
      //   DEBIT   PLATFORM_ESCROW        gatewayFee
      //   CREDIT  GATEWAY_FEES_EXPENSE   gatewayFee
      if (
        payout.amountBreakdown.gatewayFee &&
        payout.amountBreakdown.gatewayFee > 0
      ) {
        await writer.writeGatewayFeeReversal({
          feeAmount: payout.amountBreakdown.gatewayFee,
          payoutId: payoutObjectId,
          session,
        });
      }

      // Restore vendor wallet cache
      // requestedAmount = netAmount + processingFee (+ debtRecovery if any),
      // mirroring the total VENDOR_AVAILABLE reduction across all journal entries.
      await reverseVendorPayoutDeduction(
        payout.vendorId.toString(),
        payout.amountBreakdown.requestedAmount,
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Re-fetch for notification
    const updatedPayout = await PayoutRecord.findById(payoutObjectId);
    if (updatedPayout) {
      await this.notifyVendorFailure(
        updatedPayout,
        failureReason!.trim(),
      ).catch(async (err) => {
        console.error(
          `[PayoutProcessingService] Failure notification failed for payout ${payoutObjectId.toString()}:`,
          err,
        );
        if (isReportableError(err)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(err, {
                source: "service:payout-processing.notifyVendorFailure",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
      });
    }

    return {
      message:
        "Payout marked as failed. Vendor wallet has been restored and vendor has been notified.",
    };
  }

  // -------------------------------------------------------------------------
  // PRIVATE: Automated flow helpers
  // -------------------------------------------------------------------------

  /**
   * Processes a single INITIATED payout record.
   *
   * Two outcomes:
   * - Flutterwave API call succeeds → payout moves to PROCESSING
   *   The webhook (Stage 6) handles the final COMPLETED or FAILED outcome
   * - Flutterwave API call fails after all retries → payout reversed immediately,
   *   vendor wallet restored, record marked FAILED
   *
   * @param payout - The INITIATED payout record to process
   * @param transferClient - The Flutterwave transfer client instance
   * @returns Result indicating success or failure
   */
  private static async processSinglePayout(
    payout: IPayoutRecordDocument,
    transferClient: FlutterwaveTransferClient,
  ): Promise<IPayoutProcessingResult> {
    const payoutRecordId = (payout._id as mongoose.Types.ObjectId).toString();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Build the transfer payload
      // Amount is converted from Kobo to Naira — Flutterwave works in Naira
      const transferPayload: IFlutterwaveTransferPayload = {
        account_bank: payout.bankDetails.bankCode,
        account_number: payout.bankDetails.accountNumber,
        amount: koboToNaira(payout.amountBreakdown.netAmount),
        narration: `Soraxi vendor payout — ${payout.bankDetails.accountName}`,
        currency: "NGN",
        debit_currency: "NGN",
        // Use payout record ID as our unique reference
        // This is what Flutterwave echoes back in the transfer webhook
        // so Stage 6 can find the correct payout record
        reference: payoutRecordId,
      };

      // Initiate the transfer with Flutterwave
      const transferResponse =
        await transferClient.initiateTransfer(transferPayload);

      if (!transferResponse || !transferResponse.data) {
        // All retries exhausted — reverse the payout immediately
        await this.reversePayout(
          payout,
          "Flutterwave transfer API call failed after maximum retries",
        );

        return {
          payoutRecordId,
          success: false,
          error:
            "Transfer API call failed after maximum retries. Payout reversed.",
        };
      }

      // Transfer successfully initiated — move to PROCESSING
      // Stage 6 webhook handles the final COMPLETED or FAILED outcome
      const flutterwaveTransferId = transferResponse.data.id.toString();

      await updatePayoutFlutterwaveTransferId(
        payoutRecordId,
        flutterwaveTransferId,
        session,
      );

      await session.commitTransaction();
      return {
        payoutRecordId,
        success: true,
        flutterwaveTransferId,
      };
    } catch (error: any) {
      await session.abortTransaction();
      console.error(
        `[PayoutProcessingService] Unexpected error processing payout ${payoutRecordId}:`,
        error,
      );

      // Attempt to reverse on unexpected errors too
      await this.reversePayout(
        payout,
        error.message ?? "Unexpected error during transfer initiation",
      ).catch((reverseErr) => {
        // If reversal also fails, this needs urgent manual intervention
        console.error(
          `[PayoutProcessingService] CRITICAL: Failed to reverse payout ${payoutRecordId} after error:`,
          reverseErr,
        );
        // NOTE: Send urgent admin alert here — manual intervention required
      });

      return {
        payoutRecordId,
        success: false,
        error: error.message ?? "Unknown error",
      };
    } finally {
      session.endSession();
    }
  }

  /**
   * Reverses a payout that failed to initiate with Flutterwave.
   * Restores the vendor's available balance and marks the record as FAILED.
   *
   * This is distinct from Stage 6's failure handling — that handles transfers
   * that reached Flutterwave but failed in processing. This handles transfers
   * that never reached Flutterwave at all.
   *
   * @param payout - The payout record to reverse
   * @param failureReason - Human-readable reason for the failure
   */
  private static async reversePayout(
    payout: IPayoutRecordDocument,
    failureReason: string,
  ): Promise<void> {
    const payoutRecordId = (payout._id as mongoose.Types.ObjectId).toString();
    const PayoutRecord = await getPayoutRecordModel();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payoutObjectId = payout._id as mongoose.Types.ObjectId;
      const writer = await JournalEntryWriter.init();

      // --- Mark payout record as FAILED ---
      await PayoutRecord.findByIdAndUpdate(
        payoutRecordId,
        { $set: { status: PayoutStatus.FAILED, failureReason } },
        { session },
      );

      // --- PAYOUT_FAILED journal entry ---
      // Reverses the PAYOUT_PROCESSING debit from writePayoutInitiated —
      // the net amount returns to VENDOR_AVAILABLE since the transfer
      // never reached Flutterwave.
      //
      //   DEBIT   VENDOR_AVAILABLE    netAmount
      //   CREDIT  PAYOUT_PROCESSING   netAmount
      await writer.writePayoutFailed({
        vendorId: payout.vendorId,
        requestedAmount: payout.amountBreakdown.netAmount,
        payoutId: payoutObjectId,
        session,
      });

      // --- Reverse processing fee ---
      // Returns the fee revenue to the vendor and zeroes the platform's
      // commission income for this payout.
      //
      //   DEBIT   PLATFORM_REVENUE_COMMISSION   processingFee
      //   CREDIT  VENDOR_AVAILABLE              processingFee
      if (payout.amountBreakdown.processingFee > 0) {
        await writer.writePayoutProcessingFeeReversal({
          vendorId: payout.vendorId,
          processingFee: payout.amountBreakdown.processingFee,
          payoutId: payoutObjectId,
          session,
        });
      }

      // --- Reverse gateway fee ---
      // Transfer never completed, so Flutterwave did not charge the fee.
      //
      //   DEBIT   PLATFORM_ESCROW        gatewayFee
      //   CREDIT  GATEWAY_FEES_EXPENSE   gatewayFee
      if (
        payout.amountBreakdown.gatewayFee &&
        payout.amountBreakdown.gatewayFee > 0
      ) {
        await writer.writeGatewayFeeReversal({
          feeAmount: payout.amountBreakdown.gatewayFee,
          payoutId: payoutObjectId,
          session,
        });
      }

      // --- Update vendor wallet cache ---
      // Restores the full requested amount that was deducted in Stage 5.
      // requestedAmount = netAmount + processingFee (+ debtRecovery if any),
      // mirroring the total VENDOR_AVAILABLE reduction across all journal entries.
      await reverseVendorPayoutDeduction(
        payout.vendorId.toString(),
        payout.amountBreakdown.requestedAmount,
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.log(
        `[PayoutProcessingService] Vendor wallet reversal failed for payout recordId: ${payoutRecordId}.`,
      );
    } finally {
      session.endSession();
    }

    console.log(
      `[PayoutProcessingService] Reversed payout ${payoutRecordId} — vendor wallet restored, fees reversed.`,
    );
  }

  // -------------------------------------------------------------------------
  // PRIVATE: Shared notification helpers
  // -------------------------------------------------------------------------

  /**
   * Notifies the vendor that their payout was successfully transferred.
   * Fire-and-forget — always called outside the session after commit.
   * Used by both the manual confirm flow and (eventually) the automated flow.
   *
   * @param payoutRecord - The completed payout record
   */
  private static async notifyVendorSuccess(
    payoutRecord: IPayoutRecordDocument,
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
      `[PayoutProcessingService] Success notification sent for payout ${(payoutRecord._id as mongoose.Types.ObjectId).toString()}`,
    );
  }

  /**
   * Notifies the vendor that their payout failed and their balance has been restored.
   * Fire-and-forget — always called outside the session after commit.
   * Used by both the manual confirm flow and (eventually) the automated flow.
   *
   * @param payoutRecord - The failed payout record
   * @param failureReason - Human-readable reason from the admin or Flutterwave
   */
  private static async notifyVendorFailure(
    payoutRecord: IPayoutRecordDocument,
    failureReason: string,
  ): Promise<void> {
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
      `[PayoutProcessingService] Failure notification sent for payout ${(payoutRecord._id as mongoose.Types.ObjectId).toString()}`,
    );
  }
}
