import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  getPayoutRecordModel,
  IPayoutRecordDocument,
} from "@/lib/db/models/payout-record.model";
import { updatePayoutFlutterwaveTransferId } from "@/lib/db/models/payout-record.model";
import { reverseVendorPayoutDeduction } from "@/lib/db/models/vendor-wallet.model";
import {
  LedgerEntityType,
  LedgerEntryCategory,
  LedgerEntryType,
  LedgerReferenceType,
  PayoutStatus,
} from "@/enums/financial.enums";
import { koboToNaira } from "@/lib/utils/naira";
import { createLedgerEntry } from "@/lib/db/models/ledger-entry.model";

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
 * PayoutProcessingService
 *
 * Picks up all PayoutRecord documents with status INITIATED and calls
 * Flutterwave's Transfer API for each one.
 *
 * This is the bridge between Stage 5 (vendor requests payout) and
 * Stage 6 (webhook confirms outcome). After this service runs:
 * - Successful API calls → payout moves to PROCESSING, webhook handles final outcome
 * - Failed API calls → payout is reversed, vendor wallet restored
 *
 * Called by: Cron job — daily at 8am
 */
export class PayoutProcessingService {
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
        null,
      );

      return {
        payoutRecordId,
        success: true,
        flutterwaveTransferId,
      };
    } catch (error: any) {
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
      // Mark payout as FAILED
      await PayoutRecord.findByIdAndUpdate(
        payoutRecordId,
        {
          $set: {
            status: PayoutStatus.FAILED,
            failureReason,
          },
        },
        { session },
      );

      // Restore vendor's available balance
      await reverseVendorPayoutDeduction(
        payout.vendorId.toString(),
        payout.amountBreakdown.requestedAmount,
        session,
      );

      await createLedgerEntry(
        {
          type: LedgerEntryType.CREDIT,
          category: LedgerEntryCategory.PAYOUT_FAILED,
          amount: payout.amountBreakdown.requestedAmount,
          entityType: LedgerEntityType.VENDOR,
          entityId: payout.vendorId,
          referenceType: LedgerReferenceType.PAYOUT,
          referenceId: payout._id as mongoose.Types.ObjectId,
          description: `Payout of ₦${koboToNaira(payout.amountBreakdown.requestedAmount).toLocaleString()} failed after reaching Flutterwave — amount reversed to available balance`,
          metadata: {
            failureReason,
            accountNumber: payout.bankDetails.accountNumber,
            accountName: payout.bankDetails.accountName,
          },
        },
        session,
      );

      // 3. Reverse processing fee (platform revenue rollback)
      if (payout.amountBreakdown.processingFee > 0) {
        await createLedgerEntry(
          {
            type: LedgerEntryType.DEBIT,
            category: LedgerEntryCategory.COMMISSION_DEDUCTED,
            amount: payout.amountBreakdown.processingFee,
            entityType: LedgerEntityType.PLATFORM,
            entityId: payout.vendorId,
            referenceType: LedgerReferenceType.PAYOUT,
            referenceId: payout._id as mongoose.Types.ObjectId,
            description: "Reversal of processing fee due to payout failure",
            metadata: { failureReason, reversal: true },
          },
          session,
        );
      }

      // 4. Reverse gateway fee (platform expense rollback)
      if (payout.amountBreakdown.gatewayFee) {
        await createLedgerEntry(
          {
            type: LedgerEntryType.CREDIT,
            category: LedgerEntryCategory.GATEWAY_FEE_DEDUCTED,
            amount: payout.amountBreakdown.gatewayFee,
            entityType: LedgerEntityType.PLATFORM,
            entityId: payout.vendorId,
            referenceType: LedgerReferenceType.PAYOUT,
            referenceId: payout._id as mongoose.Types.ObjectId,
            description: "Reversal of gateway fee due to payout failure",
            metadata: { failureReason, reversal: true },
          },
          session,
        );
      }
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
}
