import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { IDisputeRecordDocument } from "@/lib/db/models/dispute-record.model";
import { DisputeRepository } from "@/repositories/dispute-record.repository";
import { OrderRepository } from "@/repositories/order.repository";
import { DisputeResolvedBy } from "@/enums/financial.enums";
import { getStoreModel } from "@/lib/db/models/store.model";
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
import { DisputeService } from "@/services/disputes/dispute.service";

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

    const overdueDisputes = await DisputeRepository.getOverdue();

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

    // Keep the cron adapter thin: the same application service used by a
    // human upheld decision owns all financial writes and creates the manual
    // refund work item atomically. System resolution simply changes the
    // penalty and RefundTrigger policy.
    try {
      const result = await DisputeService.upholdDispute({
        disputeId,
        resolvedBy: DisputeResolvedBy.SYSTEM,
        resolutionNotes:
          "Auto-resolved by system, resolution deadline exceeded without team action.",
      });
      await this.sendAutoResolutionNotifications(dispute, result.refundAmount);
      return { disputeId, success: true };
    } catch (error: any) {
      console.error(
        `[DisputeAutoResolutionService] Failed to auto-resolve dispute ${disputeId}:`,
        error,
      );
      return {
        disputeId,
        success: false,
        error: error.message ?? "Unknown error during auto-resolution",
      };
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
      const order = await OrderRepository.getOrderById(
        dispute.orderId.toString(),
      );
      const subOrder = order?.subOrders.find(
        (s) => s._id.toString() === dispute.suborderId.toString(),
      );
      const orderReference = order?.reference ?? "";
      const subOrderReference = subOrder?.reference ?? "";

      await Promise.allSettled([
        this.notifyCustomer(
          dispute,
          totalRefunded,
          orderReference,
          subOrderReference,
        ),
        this.notifyVendor(
          dispute,
          totalRefunded,
          orderReference,
          subOrderReference,
        ),
        this.notifyAdminTeam(
          dispute,
          totalRefunded,
          orderReference,
          subOrderReference,
        ),
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
    orderReference: string,
    subOrderReference: string,
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
          orderReference,
          subOrderReference,
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
    orderReference: string,
    subOrderReference: string,
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
          orderReference,
          subOrderReference,
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
    orderReference: string,
    subOrderReference: string,
  ): Promise<void> {
    try {
      const Store = await getStoreModel();
      const store = await Store.findById(dispute.vendorId).select("name");

      const html = await renderTemplate(
        React.createElement(DisputeAutoResolvedAdminEmail, {
          disputeId: (dispute._id as mongoose.Types.ObjectId).toString(),
          orderReference,
          subOrderReference,
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
