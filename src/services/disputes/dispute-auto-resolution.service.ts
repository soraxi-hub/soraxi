import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  getOverdueDisputes,
  IDisputeRecordDocument,
  resolveDisputeRecord,
} from "@/lib/db/models/dispute-record.model";
import {
  getTransactionRecordByOrderId,
  updateSuborderFinancialStatus,
} from "@/lib/db/models/transaction-record.model";
import {
  applyDisputeUpheldDeductions,
  getVendorWalletByVendorId,
} from "@/lib/db/models/vendor-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  SuborderFinancialStatus,
  DisputeOutcome,
  DisputeResolvedBy,
  DebtRecoveryType,
} from "@/enums/financial.enums";
import { DEBT_RECOVERY_THRESHOLD_KOBO } from "@/constants/financial.constants";
import { getStoreModel } from "@/lib/db/models/store.model";
// import { NotificationFactory, renderTemplate } from "@/domain/notification";
// import React from "react";
// NOTE: Create these email templates following your existing template pattern
// import { DisputeAutoResolvedStudentEmail } from "@/services/notifications/templates/dispute-auto-resolved-student-email";
// import { DisputeAutoResolvedVendorEmail } from "@/services/notifications/templates/dispute-auto-resolved-vendor-email";
// import { DisputeAutoResolvedAdminEmail } from "@/services/notifications/templates/dispute-auto-resolved-admin-email";

/**
 * Result of processing a single auto-resolution.
 */
interface IAutoResolutionResult {
  disputeId: string;
  success: boolean;
  error?: string;
}

/**
 * Summary returned after a full auto-resolution job run.
 */
export interface IAutoResolutionSummary {
  processedAt: Date;
  totalOverdue: number;
  resolved: number;
  failed: number;
  results: IAutoResolutionResult[];
}

/**
 * DisputeAutoResolutionService
 *
 * Handles automatic resolution of disputes that have passed their
 * 5 business day deadline without being resolved by the platform team.
 *
 * Financial outcome mirrors Stage 4A (Upheld) with two key differences:
 * 1. No penalty is applied to the vendor — the team's failure, not the vendor's
 * 2. Dispute is marked AUTO_RESOLVED with resolvedBy: SYSTEM
 *
 * NOTE: This service will eventually be merged into a full DisputeService class.
 * For now it is structured as a static class to make that migration straightforward.
 *
 * Called by: Background job (Layer 4)
 * Frequency: Runs daily or more frequently in production
 */
export class DisputeAutoResolutionService {
  /**
   * Main entry point called by the background job.
   *
   * Fetches all overdue disputes and processes each one independently.
   * A failure on one dispute does not block others — each has its own
   * session so a single bad dispute doesn't roll back the entire batch.
   *
   * @returns Summary of the job run including per-dispute results
   */
  static async processOverdueDisputes(): Promise<IAutoResolutionSummary> {
    await connectToDatabase();

    const overdueDisputes = await getOverdueDisputes();

    const summary: IAutoResolutionSummary = {
      processedAt: new Date(),
      totalOverdue: overdueDisputes.length,
      resolved: 0,
      failed: 0,
      results: [],
    };

    if (!overdueDisputes.length) {
      return summary;
    }

    // Process each dispute independently — one failure must not block others
    for (const dispute of overdueDisputes) {
      const result = await this.autoResolveDispute(dispute);
      summary.results.push(result);

      if (result.success) {
        summary.resolved++;
      } else {
        summary.failed++;
      }
    }

    // If any disputes failed, alert the admin team
    if (summary.failed > 0) {
      await this.notifyAdminOfFailures(summary);
    }

    return summary;
  }

  /**
   * Auto-resolves a single overdue dispute.
   *
   * Each dispute gets its own session — isolated from all other disputes
   * in the batch. If this dispute's writes fail, only this dispute is
   * rolled back. Others continue processing normally.
   *
   * @param dispute - The overdue dispute record to auto-resolve
   * @returns Result indicating success or failure with error detail
   */
  private static async autoResolveDispute(
    dispute: IDisputeRecordDocument,
  ): Promise<IAutoResolutionResult> {
    const disputeId = (dispute._id as mongoose.Types.ObjectId).toString();
    let session: mongoose.ClientSession | null = null;

    try {
      // Fetch transaction record to get the suborder breakdown
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

      // Guard: only process disputes that are still in DISPUTED financial status
      // Protects against processing the same dispute twice in edge cases
      if (breakdown.status !== SuborderFinancialStatus.DISPUTED) {
        return {
          disputeId,
          success: false,
          error: `Suborder ${dispute.suborderId} is not in DISPUTED status. Current: ${breakdown.status}`,
        };
      }

      // Fetch vendor wallet to determine debt recovery strategy upfront.
      // No penalty is applied in this path, but the vendor may already have
      // a negative available balance from a prior upheld dispute — if so,
      // the existing debt recovery strategy must be preserved.
      const vendorWallet = await getVendorWalletByVendorId(
        dispute.vendorId.toString(),
      );

      const currentAvailable = vendorWallet?.balances.available ?? 0;
      const wouldGoNegative = currentAvailable < 0;
      const debtAmount = wouldGoNegative ? Math.abs(currentAvailable) : 0;

      const debtRecoveryType =
        debtAmount >= DEBT_RECOVERY_THRESHOLD_KOBO
          ? DebtRecoveryType.FULL_BLOCK
          : DebtRecoveryType.PERCENTAGE_DEDUCTION;

      // All financial writes — isolated session per dispute
      session = await mongoose.startSession();
      session.startTransaction();

      const now = new Date();

      // --- DISPUTE_AUTO_RESOLVED journal entry ---
      // Refunds the frozen amount to the customer with no penalty to the vendor.
      // The platform team failed to resolve within the deadline — the vendor
      // is not penalised for the team's inaction.
      //
      //   DEBIT   VENDOR_DISPUTED          frozenAmount
      //   CREDIT  CUSTOMER_REFUND_PAYABLE  frozenAmount
      const writer = await JournalEntryWriter.init();

      await writer.writeDisputeAutoResolved({
        vendorId: dispute.vendorId,
        settleAmount: dispute.frozenAmount,
        disputeId: dispute._id as mongoose.Types.ObjectId,
        session,
      });

      // --- Update Vendor Wallet cache ---
      // Removes frozen amount from disputed balance — penalty is 0.
      // debtRecoveryType is passed in case the vendor already had negative
      // available balance from a prior penalty; it is not creating new debt here.
      await applyDisputeUpheldDeductions(
        dispute.vendorId.toString(),
        dispute.frozenAmount,
        0, // No penalty — platform team's failure, not the vendor's
        debtRecoveryType,
        0, // No new recovery percentage — no new debt is being created
        session,
      );

      // --- Update Dispute Record ---
      // AUTO_RESOLVED + SYSTEM distinguishes this from a team-resolved dispute
      await resolveDisputeRecord(
        disputeId,
        DisputeOutcome.UPHELD,
        DisputeResolvedBy.SYSTEM,
        0, // No penalty
        session,
        "Auto-resolved by system — resolution deadline exceeded without team action.",
      );

      // --- Update Transaction Record: suborder status → REFUNDED ---
      await updateSuborderFinancialStatus(
        dispute.orderId.toString(),
        dispute.suborderId.toString(),
        SuborderFinancialStatus.REFUNDED,
        session,
      );

      // --- Flag vendor account for review ---
      // NOTE: Replace "flaggedForReview" with the actual field name on your
      // store model. Add this field to your store schema if it doesn't exist.
      // Suggested field: flaggedForReview: { type: Boolean, default: false }
      const Store = await getStoreModel();
      await Store.findByIdAndUpdate(
        dispute.vendorId,
        {
          $set: {
            flaggedForReview: true, // NOTE: Confirm field name on your store model
            flaggedAt: now, // NOTE: Add this field to store schema if needed
          },
        },
        { session },
      );

      await session.commitTransaction();

      // Send notifications outside the session — network calls don't belong in transactions
      await this.sendAutoResolutionNotifications(dispute);

      return { disputeId, success: true };
    } catch (error: any) {
      if (session) {
        await session.abortTransaction();
      }

      console.error(
        `[DisputeAutoResolutionService] Failed to auto-resolve dispute ${disputeId}:`,
        error,
      );

      return {
        disputeId,
        success: false,
        error: error.message ?? "Unknown error during auto-resolution",
      };
    } finally {
      if (session) {
        session.endSession();
      }
    }
  }

  /**
   * Sends notifications to all three parties after a successful auto-resolution:
   * - Student: their dispute was upheld and a refund is on the way
   * - Vendor: their funds were released to the student due to inaction
   * - Admin team: a dispute was auto-resolved due to their inaction
   *
   * Notifications are fire-and-forget — a notification failure must never
   * cause a financial rollback.
   *
   * NOTE: Implement the three email templates and uncomment the notification
   * calls below. Follow the same pattern as your existing email templates.
   *
   * @param dispute - The auto-resolved dispute record
   */
  private static async sendAutoResolutionNotifications(
    dispute: IDisputeRecordDocument,
  ): Promise<void> {
    try {
      await Promise.allSettled([
        // NOTE: Uncomment and implement once templates are created
        // this.notifyStudent(dispute),
        // this.notifyVendor(dispute),
        // this.notifyAdminTeam(dispute),
      ]);
    } catch (error) {
      // Swallow notification errors — financial writes already committed
      console.error(
        `[DisputeAutoResolutionService] Notification failed for dispute ${(dispute._id as mongoose.Types.ObjectId).toString()}:`,
        error,
      );
    }
  }

  /**
   * Notifies the admin team when one or more disputes in a batch
   * failed to auto-resolve. These need manual intervention.
   *
   * @param summary - The full job run summary
   */
  private static async notifyAdminOfFailures(
    summary: IAutoResolutionSummary,
  ): Promise<void> {
    try {
      const failedIds = summary.results
        .filter((r) => !r.success)
        .map((r) => r.disputeId);

      console.error(
        `[DisputeAutoResolutionService] ${summary.failed} dispute(s) failed auto-resolution. Dispute IDs: ${failedIds.join(", ")}`,
      );

      // NOTE: Send admin alert email here following your existing
      // NotificationFactory pattern. Include the failed dispute IDs
      // so the team can investigate and manually resolve them.
    } catch (error) {
      console.error(
        "[DisputeAutoResolutionService] Failed to notify admin of batch failures:",
        error,
      );
    }
  }
}
