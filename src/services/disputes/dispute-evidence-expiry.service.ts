import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  getDisputeRecordModel,
  IDisputeRecordDocument,
} from "@/lib/db/models/dispute-record.model";
import {
  getTransactionRecordByOrderId,
  updateSuborderFinancialStatus,
} from "@/lib/db/models/transaction-record.model";
import { releaseVendorDisputedToAvailable } from "@/lib/db/models/vendor-wallet.model";
import { resolveDisputeRecord } from "@/lib/db/models/dispute-record.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  SuborderFinancialStatus,
  DisputeStatus,
  DisputeOutcome,
  DisputeResolvedBy,
} from "@/enums/financial.enums";

/**
 * Result of processing a single expired evidence deadline.
 */
interface IEvidenceExpiryResult {
  disputeId: string;
  success: boolean;
  error?: string;
}

/**
 * Summary returned after a full evidence expiry job run.
 */
export interface IEvidenceExpirySummary {
  processedAt: Date;
  totalExpired: number;
  resolved: number;
  failed: number;
  results: IEvidenceExpiryResult[];
}

/**
 * DisputeEvidenceExpiryService
 *
 * Handles disputes where the student failed to submit additional evidence
 * within the 48-hour window after a dispute was marked inconclusive.
 *
 * Outcome: Stage 4B (Rejected) financial flow — funds released to vendor.
 * The student had their chance to provide more evidence and did not.
 *
 * NOTE: This service will eventually be merged into a full DisputeService class.
 *
 * Called by: Background job (Layer 4)
 * Frequency: Runs every few hours to catch expiries promptly
 */
export class DisputeEvidenceExpiryService {
  /**
   * Main entry point called by the background job.
   *
   * Fetches all AWAITING_EVIDENCE disputes whose additionalEvidenceDeadline
   * has passed and processes each independently.
   *
   * @returns Summary of the job run including per-dispute results
   */
  static async processExpiredEvidenceDeadlines(): Promise<IEvidenceExpirySummary> {
    await connectToDatabase();

    // Fetch all disputes that are:
    // - Still in AWAITING_EVIDENCE status (student hasn't responded)
    // - Past their additional evidence deadline
    const DisputeRecord = await getDisputeRecordModel();
    const expiredDisputes = await DisputeRecord.find<IDisputeRecordDocument>({
      status: DisputeStatus.AWAITING_EVIDENCE,
      additionalEvidenceDeadline: { $lte: new Date() },
    });

    const summary: IEvidenceExpirySummary = {
      processedAt: new Date(),
      totalExpired: expiredDisputes.length,
      resolved: 0,
      failed: 0,
      results: [],
    };

    if (!expiredDisputes.length) {
      return summary;
    }

    // Process each expired dispute independently
    for (const dispute of expiredDisputes) {
      const result = await this.rejectExpiredDispute(dispute);
      summary.results.push(result);

      if (result.success) {
        summary.resolved++;
      } else {
        summary.failed++;
        console.error(
          `[DisputeEvidenceExpiryService] Failed to process dispute ${result.disputeId}: ${result.error}`,
        );
      }
    }

    return summary;
  }

  /**
   * Rejects a single dispute whose evidence deadline has expired.
   * Runs the Stage 4B (Rejected) financial flow:
   * - FUNDS_RELEASED ledger entry
   * - Vendor wallet: disputed → available
   * - Dispute record: RESOLVED, outcome: REJECTED
   * - Transaction record: suborder status → SETTLED
   *
   * Each dispute gets its own session — one failure does not block others.
   *
   * @param dispute - The expired AWAITING_EVIDENCE dispute to reject
   * @returns Result indicating success or failure
   */
  private static async rejectExpiredDispute(
    dispute: IDisputeRecordDocument,
  ): Promise<IEvidenceExpiryResult> {
    const disputeId = (dispute._id as mongoose.Types.ObjectId).toString();
    let session: mongoose.ClientSession | null = null;

    try {
      // Fetch transaction record to get suborder breakdown
      const transactionRecord = await getTransactionRecordByOrderId(
        dispute.orderId.toString(),
      );

      if (!transactionRecord) {
        return {
          disputeId,
          success: false,
          error: `Transaction record not found for order ${dispute.orderId}`,
        };
      }

      const breakdown = transactionRecord.suborderBreakdowns.find(
        (b) => b.suborderId.toString() === dispute.suborderId.toString(),
      );

      if (!breakdown) {
        return {
          disputeId,
          success: false,
          error: `No financial breakdown found for suborder ${dispute.suborderId}`,
        };
      }

      // Guard: only process suborders still in DISPUTED financial status
      if (breakdown.status !== SuborderFinancialStatus.DISPUTED) {
        return {
          disputeId,
          success: false,
          error: `Suborder ${dispute.suborderId} is not in DISPUTED status. Current: ${breakdown.status}`,
        };
      }

      // All financial writes in an isolated session
      session = await mongoose.startSession();
      session.startTransaction();

      // --- DISPUTE_REJECTED journal entry ---
      // Student did not submit additional evidence within the 48-hour window —
      // frozen funds are returned to the vendor's available balance.
      //
      //   DEBIT   VENDOR_AVAILABLE   frozenAmount
      //   CREDIT  VENDOR_DISPUTED    frozenAmount
      const writer = await JournalEntryWriter.init();

      await writer.writeDisputeRejected({
        vendorId: dispute.vendorId,
        settleAmount: dispute.frozenAmount,
        disputeId: dispute._id as mongoose.Types.ObjectId,
        session,
      });

      // --- Update Vendor Wallet cache: disputed → available ---
      // Mirrors the VENDOR_DISPUTED → VENDOR_AVAILABLE movement above.
      await releaseVendorDisputedToAvailable(
        dispute.vendorId.toString(),
        dispute.frozenAmount,
        session,
      );

      // --- Update Dispute Record: RESOLVED, outcome: REJECTED ---
      await resolveDisputeRecord(
        disputeId,
        DisputeOutcome.REJECTED,
        DisputeResolvedBy.SYSTEM,
        0, // No penalty
        session,
        "Auto-rejected by system — student did not submit additional evidence within the 48-hour window.",
      );

      // --- Update Transaction Record: suborder status → SETTLED ---
      await updateSuborderFinancialStatus(
        dispute.orderId.toString(),
        dispute.suborderId.toString(),
        SuborderFinancialStatus.SETTLED,
        session,
      );

      await session.commitTransaction();

      // Notify both parties outside the session
      await this.sendExpiryNotifications(dispute);

      return { disputeId, success: true };
    } catch (error: any) {
      if (session) {
        await session.abortTransaction();
      }

      console.error(
        `[DisputeEvidenceExpiryService] Failed to reject expired dispute ${disputeId}:`,
        error,
      );

      return {
        disputeId,
        success: false,
        error: error.message ?? "Unknown error",
      };
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Notifies both the student and vendor after an evidence expiry rejection.
   * Fire-and-forget — notification failure must never cause a financial rollback.
   *
   * NOTE: Implement the two email templates and uncomment the calls below.
   * - Student: their dispute was rejected due to inaction
   * - Vendor: their frozen funds have been released
   *
   * @param dispute - The resolved dispute record
   */
  private static async sendExpiryNotifications(
    dispute: IDisputeRecordDocument,
  ): Promise<void> {
    try {
      await Promise.allSettled([
        // NOTE: Uncomment and implement once templates are created
        // this.notifyStudent(dispute),
        // this.notifyVendor(dispute),
      ]);
    } catch (error) {
      console.error(
        `[DisputeEvidenceExpiryService] Notification failed for dispute ${(dispute._id as mongoose.Types.ObjectId).toString()}:`,
        error,
      );
    }
  }
}
