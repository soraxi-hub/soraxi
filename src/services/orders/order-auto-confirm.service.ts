import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getOrderModel, type IOrder } from "@/lib/db/models/order.model";
import {
  getTransactionRecordByOrderId,
  updateSuborderFinancialStatus,
} from "@/lib/db/models/transaction-record.model";
import { releaseVendorPendingToAvailable } from "@/lib/db/models/vendor-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import { DeliveryStatus, StatusHistory } from "@/enums";

// Number of days before auto-confirm fires
const AUTO_CONFIRM_DAYS = 3;

/**
 * Result of processing a single suborder auto-confirmation.
 */
interface IAutoConfirmResult {
  orderId: string;
  subOrderId: string;
  success: boolean;
  error?: string;
}

/**
 * Summary returned after a full auto-confirm job run.
 */
export interface IAutoConfirmSummary {
  processedAt: Date;
  totalEligible: number;
  confirmed: number;
  failed: number;
  results: IAutoConfirmResult[];
}

/**
 * OrderAutoConfirmService
 *
 * Finds all suborders that have been out for delivery for more than
 * AUTO_CONFIRM_DAYS days without student confirmation, and automatically
 * confirms them — running the same Stage 2 financial logic as
 * customerConfirmedDelivery but triggered by the system.
 *
 * Eligibility criteria for a suborder:
 * - deliveryStatus is OutForDelivery
 * - customerConfirmedDelivery.confirmed is false
 * - The OutForDelivery statusHistory entry is older than AUTO_CONFIRM_DAYS
 * - Financial status in TransactionRecord is still PENDING
 *
 * Called by: Cron job — every 6 hours
 */
export class OrderAutoConfirmService {
  /**
   * Main entry point called by the background job.
   * Finds all eligible suborders and processes each independently.
   *
   * @returns Summary of the job run
   */
  static async processEligibleSuborders(): Promise<IAutoConfirmSummary> {
    await connectToDatabase();

    const eligibleSuborders = await this.findEligibleSuborders();

    const summary: IAutoConfirmSummary = {
      processedAt: new Date(),
      totalEligible: eligibleSuborders.length,
      confirmed: 0,
      failed: 0,
      results: [],
    };

    if (!eligibleSuborders.length) {
      return summary;
    }

    for (const { order, subOrderId } of eligibleSuborders) {
      const result = await this.autoConfirmSuborder(order, subOrderId);
      summary.results.push(result);

      if (result.success) {
        summary.confirmed++;
      } else {
        summary.failed++;
        console.error(
          `[OrderAutoConfirmService] Failed to auto-confirm suborder ${subOrderId}:`,
          result.error,
        );
      }
    }

    return summary;
  }

  /**
   * Finds all suborders eligible for auto-confirmation.
   *
   * Uses the statusHistory array to find the exact timestamp when
   * the suborder was marked OutForDelivery, then checks if that
   * timestamp is older than AUTO_CONFIRM_DAYS days.
   *
   * @returns Array of eligible orders and their suborder IDs
   */
  private static async findEligibleSuborders(): Promise<
    Array<{ order: IOrder; subOrderId: string }>
  > {
    await connectToDatabase();
    const Order = await getOrderModel();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUTO_CONFIRM_DAYS);

    // Find orders that have at least one qualifying suborder
    // The suborder-level filtering happens in JS after the query
    // because MongoDB's nested array filtering has limitations here
    const orders = await Order.find({
      "subOrders.deliveryStatus": DeliveryStatus.OutForDelivery,
      "subOrders.customerConfirmedDelivery.confirmed": false,
      "subOrders.statusHistory": {
        $elemMatch: {
          status: StatusHistory.OutForDelivery,
          timestamp: { $lte: cutoffDate },
        },
      },
    }).lean<IOrder[]>();

    const eligible: Array<{ order: IOrder; subOrderId: string }> = [];

    for (const order of orders) {
      for (const subOrder of order.subOrders) {
        // Must be OutForDelivery and not yet confirmed
        if (
          subOrder.deliveryStatus !== DeliveryStatus.OutForDelivery ||
          subOrder.customerConfirmedDelivery.confirmed
        ) {
          continue;
        }

        // Find the OutForDelivery status history entry
        const outForDeliveryEntry = subOrder.statusHistory.find(
          (entry) => entry.status === StatusHistory.OutForDelivery,
        );

        if (!outForDeliveryEntry) continue;

        // Check if it has been out for delivery for more than AUTO_CONFIRM_DAYS
        const entryDate = new Date(outForDeliveryEntry.timestamp);
        if (entryDate > cutoffDate) continue;

        eligible.push({
          order,
          subOrderId: subOrder._id.toString(),
        });
      }
    }

    return eligible;
  }

  /**
   * Auto-confirms a single eligible suborder.
   * Runs the Stage 2 financial flow and updates the order document.
   *
   * Each suborder gets its own session — one failure does not block others.
   *
   * @param order - The parent order document
   * @param subOrderId - The ID of the suborder to auto-confirm
   * @returns Result indicating success or failure
   */
  private static async autoConfirmSuborder(
    order: IOrder,
    subOrderId: string,
  ): Promise<IAutoConfirmResult> {
    const orderId = order._id.toString();
    let session: mongoose.ClientSession | null = null;

    try {
      // Fetch transaction record to get settle amount for this suborder
      const transactionRecord = await getTransactionRecordByOrderId(orderId);

      if (!transactionRecord) {
        return {
          orderId,
          subOrderId,
          success: false,
          error: `Transaction record not found for order ${orderId}`,
        };
      }

      const breakdown = transactionRecord.suborderBreakdowns.find(
        (b) => b.suborderId.toString() === subOrderId,
      );

      if (!breakdown) {
        return {
          orderId,
          subOrderId,
          success: false,
          error: `No financial breakdown found for suborder ${subOrderId}`,
        };
      }

      // Guard: only settle suborders still in PENDING financial status
      if (breakdown.status !== SuborderFinancialStatus.PENDING) {
        return {
          orderId,
          subOrderId,
          success: false,
          error: `Suborder ${subOrderId} is not in PENDING status. Current: ${breakdown.status}`,
        };
      }

      session = await mongoose.startSession();
      session.startTransaction();

      const now = new Date();

      // --- FUNDS_RELEASED journal entry ---
      // Records the movement of vendor funds from VENDOR_PENDING to
      // VENDOR_AVAILABLE now that the 3-day confirmation window has elapsed.
      // Offsets: DEBIT VENDOR_AVAILABLE / CREDIT VENDOR_PENDING
      const writer = await JournalEntryWriter.init();

      await writer.writeFundsReleased({
        vendorId: breakdown.vendorId,
        settleAmount: breakdown.settleAmount,
        suborderId: breakdown.suborderId,
        triggeredBy: "AUTO_CONFIRMATION",
        session,
      });

      // --- Update Transaction Record: suborder status → SETTLED ---
      await updateSuborderFinancialStatus(
        orderId,
        subOrderId,
        SuborderFinancialStatus.SETTLED,
        session,
      );

      // --- Update Vendor Wallet cache: pending → available ---
      // Mirrors the VENDOR_PENDING → VENDOR_AVAILABLE movement above.
      await releaseVendorPendingToAvailable(
        breakdown.vendorId.toString(),
        breakdown.settleAmount,
        session,
      );

      // --- Update the order document: mark suborder as auto-confirmed ---
      const Order = await getOrderModel();
      await Order.findOneAndUpdate(
        {
          _id: order._id,
          "subOrders._id": new mongoose.Types.ObjectId(subOrderId),
        },
        {
          $set: {
            "subOrders.$.deliveryStatus": DeliveryStatus.Delivered,
            "subOrders.$.customerConfirmedDelivery.confirmed": true,
            "subOrders.$.customerConfirmedDelivery.autoConfirmed": true,
            "subOrders.$.deliveryDate": now,
          },
          $push: {
            "subOrders.$.statusHistory": {
              status: StatusHistory.Delivered,
              timestamp: now,
              notes:
                "Auto-confirmed by system — 3-day confirmation window expired.",
            },
          },
        },
        { session },
      );

      await session.commitTransaction();

      return { orderId, subOrderId, success: true };
    } catch (error: any) {
      if (session) await session.abortTransaction();

      console.error(
        `[OrderAutoConfirmService] Failed to auto-confirm suborder ${subOrderId}:`,
        error,
      );

      return {
        orderId,
        subOrderId,
        success: false,
        error: error.message ?? "Unknown error",
      };
    } finally {
      if (session) session.endSession();
    }
  }
}
