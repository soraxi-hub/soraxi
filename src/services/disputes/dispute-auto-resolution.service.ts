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
import { applyDisputeUpheldDeductions } from "@/lib/db/models/vendor-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  SuborderFinancialStatus,
  DisputeOutcome,
  DisputeResolvedBy,
  DebtRecoveryType,
} from "@/enums/financial.enums";
import { getStoreModel } from "@/lib/db/models/store.model";
import { debitPlatformCommission } from "@/lib/db/models/platform-wallet.model";
import {
  NotificationFactory,
  renderTemplate,
  DisputeAutoResolvedCustomerEmail,
  DisputeAutoResolvedVendorEmail,
  DisputeAutoResolvedAdminEmail,
  AdminNotificationEmail,
} from "@/domain/notification";
import React from "react";
import { getUserModel } from "@/lib/db/models/user.model";
import { formatNaira } from "@/lib/utils/naira";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

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
   * Each dispute gets its own session, isolated from all other disputes
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

      // All financial writes, isolated session per dispute
      session = await mongoose.startSession();
      session.startTransaction();

      const now = new Date();

      // --- DISPUTE_AUTO_RESOLVED journal entry ---
      // Refunds the full amountPaid (settle + commission) to the customer with
      // no penalty to the vendor. The platform team failed to resolve within
      // the deadline, so the vendor is not penalised for the team's inaction.
      //
      //   Pair 1, Refund of frozen settle amount:
      //     DEBIT   VENDOR_DISPUTED          frozenAmount
      //     CREDIT  CUSTOMER_REFUND_PAYABLE  frozenAmount
      //
      //   Pair 2, Commission reversed (customer receives full amountPaid back):
      //     DEBIT   PLATFORM_REVENUE_COMMISSION  commission
      //     CREDIT  CUSTOMER_REFUND_PAYABLE      commission
      const writer = await JournalEntryWriter.init();

      await writer.writeDisputeAutoResolved({
        vendorId: dispute.vendorId,
        customerId: dispute.customerId,
        settleAmount: dispute.frozenAmount,
        commission: breakdown.commission,
        disputeId: dispute._id as mongoose.Types.ObjectId,
        session,
      });

      // --- Update Vendor Wallet cache ---
      // Removes frozen amount from disputed balance. Penalty is 0, so the wallet
      // method touches neither available nor debt. FULL_BLOCK and 0 satisfy the
      // signature and have no effect at zero penalty (no policy is set).
      await applyDisputeUpheldDeductions(
        dispute.vendorId.toString(),
        dispute.frozenAmount,
        0, // No penalty, platform team's failure, not the vendor's
        DebtRecoveryType.FULL_BLOCK,
        0,
        session,
      );

      // --- Update Platform Wallet cache ---
      // Mirrors the PLATFORM_REVENUE_COMMISSION DEBIT in writeDisputeAutoResolved.
      // Commission is reversed since the student receives the full amountPaid back.
      await debitPlatformCommission(breakdown.commission, session);

      // --- Update Dispute Record ---
      // AUTO_RESOLVED + SYSTEM distinguishes this from a team-resolved dispute
      await resolveDisputeRecord(
        disputeId,
        DisputeOutcome.UPHELD,
        DisputeResolvedBy.SYSTEM,
        0, // No penalty
        session,
        "Auto-resolved by system, resolution deadline exceeded without team action.",
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

      // Send notifications outside the session, network calls don't belong in transactions
      await this.sendAutoResolutionNotifications(
        dispute,
        dispute.frozenAmount + breakdown.commission,
      );

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
   * - Customer: their dispute was upheld and a refund is on the way
   * - Vendor: their funds were released to the customer due to inaction
   * - Admin team: a dispute was auto-resolved due to their inaction
   *
   * Notifications are fire-and-forget — a notification failure must never
   * cause a financial rollback.
   *
   * @param dispute - The auto-resolved dispute record
   * @param totalRefunded - Full amount refunded to the customer (settle + commission), in Kobo
   */
  private static async sendAutoResolutionNotifications(
    dispute: IDisputeRecordDocument,
    totalRefunded: number,
  ): Promise<void> {
    try {
      await Promise.allSettled([
        this.notifyCustomer(dispute, totalRefunded),
        this.notifyVendor(dispute, totalRefunded),
        this.notifyAdminTeam(dispute, totalRefunded),
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
   * Notifies the customer that their dispute was auto-resolved in their
   * favour and a full refund has been issued.
   *
   * @param dispute - The auto-resolved dispute record
   * @param totalRefunded - Full amount refunded to the customer, in Kobo
   */
  private static async notifyCustomer(
    dispute: IDisputeRecordDocument,
    totalRefunded: number,
  ): Promise<void> {
    try {
      const User = await getUserModel();
      const customer = await User.findById(dispute.customerId).select(
        "email firstName",
      );

      if (!customer) return;

      const html = await renderTemplate(
        React.createElement(DisputeAutoResolvedCustomerEmail, {
          customerName: customer.firstName,
          orderId: dispute.orderId.toString(),
          suborderId: dispute.suborderId.toString(),
          refundAmount: formatNaira(totalRefunded),
        }),
      );

      const notification = NotificationFactory.create("email", {
        recipient: customer.email,
        subject: "Your dispute has been resolved in your favour",
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text: `Your dispute was auto-resolved in your favour. A refund of ${formatNaira(totalRefunded)} has been issued.`,
      });

      await notification.send();
    } catch (error) {
      console.error(
        `[DisputeAutoResolutionService] Customer notification failed for dispute ${(dispute._id as mongoose.Types.ObjectId).toString()}:`,
        error,
      );
      await this.reportNotificationError(error, "notifyCustomer");
    }
  }

  /**
   * Notifies the vendor that funds were released to the customer because the
   * platform team missed the resolution deadline — not due to any vendor fault.
   *
   * @param dispute - The auto-resolved dispute record
   * @param totalRefunded - Full amount refunded to the customer, in Kobo
   */
  private static async notifyVendor(
    dispute: IDisputeRecordDocument,
    totalRefunded: number,
  ): Promise<void> {
    try {
      const Store = await getStoreModel();
      const store = await Store.findById(dispute.vendorId).select(
        "storeEmail name",
      );

      if (!store) return;

      const html = await renderTemplate(
        React.createElement(DisputeAutoResolvedVendorEmail, {
          storeName: store.name,
          orderId: dispute.orderId.toString(),
          suborderId: dispute.suborderId.toString(),
          amountReleased: formatNaira(totalRefunded),
        }),
      );

      const notification = NotificationFactory.create("email", {
        recipient: store.storeEmail,
        subject: "Dispute auto-resolved — funds released to customer",
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text: `A dispute on one of your orders was auto-resolved and ${formatNaira(totalRefunded)} was refunded to the customer. No penalty was applied to your account.`,
      });

      await notification.send();
    } catch (error) {
      console.error(
        `[DisputeAutoResolutionService] Vendor notification failed for dispute ${(dispute._id as mongoose.Types.ObjectId).toString()}:`,
        error,
      );
      await this.reportNotificationError(error, "notifyVendor");
    }
  }

  /**
   * Notifies the admin/platform team that a dispute was auto-resolved due
   * to the team missing the resolution deadline. Fires for every successful
   * auto-resolution so the team is aware their SLA was missed.
   *
   * @param dispute - The auto-resolved dispute record
   * @param totalRefunded - Full amount refunded to the customer, in Kobo
   */
  private static async notifyAdminTeam(
    dispute: IDisputeRecordDocument,
    totalRefunded: number,
  ): Promise<void> {
    try {
      const Store = await getStoreModel();
      const store = await Store.findById(dispute.vendorId).select("name");

      const html = await renderTemplate(
        React.createElement(DisputeAutoResolvedAdminEmail, {
          disputeId: (dispute._id as mongoose.Types.ObjectId).toString(),
          orderId: dispute.orderId.toString(),
          suborderId: dispute.suborderId.toString(),
          storeName: store?.name ?? "Unknown store",
          refundAmount: formatNaira(totalRefunded),
        }),
      );

      const notification = NotificationFactory.create("email", {
        recipient: "admin@soraxihub.com",
        subject: "Dispute auto-resolved — resolution deadline missed",
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text: `Dispute ${(dispute._id as mongoose.Types.ObjectId).toString()} was auto-resolved after missing the resolution deadline.`,
      });

      await notification.send();
    } catch (error) {
      console.error(
        `[DisputeAutoResolutionService] Admin notification failed for dispute ${(dispute._id as mongoose.Types.ObjectId).toString()}:`,
        error,
      );
      await this.reportNotificationError(error, "notifyAdminTeam");
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

      const html = await renderTemplate(
        React.createElement(AdminNotificationEmail, {
          title: "Dispute Auto-Resolution Failures",
          content: `${summary.failed} dispute(s) failed to auto-resolve during the background job run and require manual investigation.`,
          details: {
            "Processed At": summary.processedAt.toISOString(),
            "Total Overdue": summary.totalOverdue.toString(),
            Resolved: summary.resolved.toString(),
            Failed: summary.failed.toString(),
            "Failed Dispute IDs": failedIds.join(", "),
          },
        }),
      );

      const notification = NotificationFactory.create("email", {
        recipient: "admin@soraxihub.com",
        subject: `Admin Alert: ${summary.failed} dispute(s) failed auto-resolution`,
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text: `${summary.failed} dispute(s) failed auto-resolution. Dispute IDs: ${failedIds.join(", ")}`,
      });

      await notification.send();
    } catch (error) {
      console.error(
        "[DisputeAutoResolutionService] Failed to notify admin of batch failures:",
        error,
      );
      await this.reportNotificationError(error, "notifyAdminOfFailures");
    }
  }

  /**
   * Reports a reportable notification error to the ops Telegram channel.
   * Never throws — notification failures must never affect financial writes.
   *
   * @param error - The error raised while sending a notification
   * @param source - Short identifier for where the failure occurred
   */
  private static async reportNotificationError(
    error: unknown,
    source: string,
  ): Promise<void> {
    if (!isReportableError(error)) return;

    try {
      await sendTelegramMessage(
        formatErrorReport(error, {
          source: `service:dispute-auto-resolution.${source}`,
        }),
      );
    } catch {
      // sendTelegramMessage already console.errors internally; never mask the original error
    }
  }
}
