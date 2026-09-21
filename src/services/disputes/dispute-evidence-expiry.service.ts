import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { IDisputeRecordDocument } from "@/lib/db/models/dispute-record.model";
import { DisputeRepository } from "@/repositories/dispute-record.repository";
import { DisputeResolvedBy } from "@/enums/financial.enums";
import {
  NotificationFactory,
  renderTemplate,
  DisputeEvidenceExpiredCustomerEmail,
  DisputeEvidenceExpiredVendorEmail,
} from "@/domain/notification";
import React from "react";
import { getUserModel } from "@/lib/db/models/user.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { formatNaira } from "@/lib/utils/naira";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import { DisputeService } from "@/services/disputes/dispute.service";

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
    const expiredDisputes = await DisputeRepository.getAwaitingEvidenceExpired();

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
    try {
      await DisputeService.rejectDispute({
        disputeId,
        resolvedBy: DisputeResolvedBy.SYSTEM,
        resolutionNotes:
          "Auto-rejected by system — student did not submit additional evidence within the 48-hour window.",
      });
      await this.sendExpiryNotifications(dispute);
      return { disputeId, success: true };
    } catch (error: any) {
      return { disputeId, success: false, error: error.message ?? "Unknown error" };
    }
  }

  /**
   * Notifies both the customer and vendor after an evidence expiry rejection.
   * Fire-and-forget — notification failure must never cause a financial rollback.
   * - Customer: their dispute was rejected due to inaction
   * - Vendor: their frozen funds have been released
   *
   * @param dispute - The resolved dispute record
   */
  private static async sendExpiryNotifications(
    dispute: IDisputeRecordDocument,
  ): Promise<void> {
    try {
      await Promise.allSettled([
        this.notifyCustomer(dispute),
        this.notifyVendor(dispute),
      ]);
    } catch (error) {
      console.error(
        `[DisputeEvidenceExpiryService] Notification failed for dispute ${(dispute._id as mongoose.Types.ObjectId).toString()}:`,
        error,
      );
    }
  }

  /**
   * Notifies the customer that their dispute was closed in the vendor's
   * favour because they did not submit additional evidence in time.
   *
   * @param dispute - The resolved dispute record
   */
  private static async notifyCustomer(
    dispute: IDisputeRecordDocument,
  ): Promise<void> {
    try {
      const User = await getUserModel();
      const customer = await User.findById(dispute.customerId).select(
        "email firstName",
      );

      if (!customer) return;

      const html = await renderTemplate(
        React.createElement(DisputeEvidenceExpiredCustomerEmail, {
          customerName: customer.firstName,
          orderId: dispute.orderId.toString(),
          suborderId: dispute.suborderId.toString(),
        }),
      );

      const notification = NotificationFactory.create("email", {
        recipient: customer.email,
        subject: "Your dispute has been closed",
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text: "Your dispute was closed because no additional evidence was received within the 48-hour window. The funds have been released to the vendor.",
      });

      await notification.send();
    } catch (error) {
      console.error(
        `[DisputeEvidenceExpiryService] Customer notification failed for dispute ${(dispute._id as mongoose.Types.ObjectId).toString()}:`,
        error,
      );
      await this.reportNotificationError(error, "notifyCustomer");
    }
  }

  /**
   * Notifies the vendor that the frozen funds have been released back to
   * their available balance because the customer did not submit additional
   * evidence in time.
   *
   * @param dispute - The resolved dispute record
   */
  private static async notifyVendor(
    dispute: IDisputeRecordDocument,
  ): Promise<void> {
    try {
      const Store = await getStoreModel();
      const store = await Store.findById(dispute.vendorId).select(
        "storeEmail name",
      );

      if (!store) return;

      const html = await renderTemplate(
        React.createElement(DisputeEvidenceExpiredVendorEmail, {
          storeName: store.name,
          orderId: dispute.orderId.toString(),
          suborderId: dispute.suborderId.toString(),
          amountReleased: formatNaira(dispute.frozenAmount),
        }),
      );

      const notification = NotificationFactory.create("email", {
        recipient: store.storeEmail,
        subject: "Dispute closed in your favour — funds released",
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text: `A dispute on one of your orders was closed in your favour. ${formatNaira(dispute.frozenAmount)} has been released to your available balance.`,
      });

      await notification.send();
    } catch (error) {
      console.error(
        `[DisputeEvidenceExpiryService] Vendor notification failed for dispute ${(dispute._id as mongoose.Types.ObjectId).toString()}:`,
        error,
      );
      await this.reportNotificationError(error, "notifyVendor");
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
          source: `service:dispute-evidence-expiry.${source}`,
        }),
      );
    } catch {
      // sendTelegramMessage already console.errors internally; never mask the original error
    }
  }
}
