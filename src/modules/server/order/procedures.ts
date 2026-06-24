import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getOrderModel } from "@/lib/db/models/order.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { DeliveryStatus, StatusHistory } from "@/enums";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import {
  getTransactionRecordByOrderId,
  updateSuborderFinancialStatus,
} from "@/lib/db/models/transaction-record.model";
import { releaseVendorPendingToAvailable } from "@/lib/db/models/vendor-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import { OrderFactory } from "@/domain/orders/order-factory";

const orderService = OrderFactory.getOrderServiceInstance();

/**
 * Order Router with Type-Safe Procedures
 *
 * Provides fully typed tRPC procedures for order management operations.
 */
export const orderRouter = createTRPCRouter({
  /**
   * Get Orders by User ID Procedure
   *
   * Retrieves all orders for a specific user.
   *
   * @param input.userId - The user ID to fetch orders for
   * @returns Array of formatted orders with populated data
   */
  getByUserId: baseProcedure.query(async ({ ctx }) => {
    try {
      const { user } = ctx;

      if (!user || !user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User must be authenticated to access orders",
        });
      }

      return await orderService.getOrdersByUser(user.id);
    } catch (error) {
      throw handleTRPCError(error, "Error in getByUserId procedure.");
    }
  }),

  /**
   * Get Order by Order ID Procedure
   *
   * Retrieves a single order by its.
   *
   * @param input.orderId - The order ID to retrieve
   * @returns Single formatted order with populated data
   */
  getByOrderId: baseProcedure
    .input(
      z.object({
        orderId: z.string().min(1, "Order ID is required"),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { orderId } = input;

        return await orderService.getOrderUserView(orderId);
      } catch (error) {
        throw handleTRPCError(error, "Error in getByOrderId procedure.");
      }
    }),

  customerConfirmedDelivery: baseProcedure
    .input(
      z.object({
        mainOrderId: z.string(),
        subOrderId: z.string(),
        deliveryStatus: z.enum([DeliveryStatus.Delivered]),
      }),
    )
    .mutation(async ({ input }) => {
      const { mainOrderId, subOrderId, deliveryStatus } = input;
      const now = new Date();

      // Validate user ID format
      if (
        !mongoose.Types.ObjectId.isValid(mainOrderId) ||
        !mongoose.Types.ObjectId.isValid(subOrderId)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid main Order ID or subOrder ID format",
        });
      }

      const Order = await getOrderModel();

      const order = await Order.findById(mainOrderId);
      // Handle case where order is not found
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Order with ID ${mainOrderId} not found`,
        });
      }

      // ==================== Sub-Order Update ====================

      /**
       * Find and Update Sub-Order
       *
       * Locates the specific sub-order within the order and applies the
       * status update along with any additional information.
       */
      const subOrder = order.subOrders.find(
        (sub) => sub._id?.toString() === subOrderId,
      );

      if (deliveryStatus !== DeliveryStatus.Delivered) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `BAD REQUEST: DELIVERY STATUS MUST BE MARKED AS "${DeliveryStatus.Delivered}" and not "${deliveryStatus}".`,
        });
      }

      if (!subOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `The specified sub-order: ${subOrderId} could not be found.`,
        });
      }

      const acceptableCurrentStatuses = [
        DeliveryStatus.OutForDelivery,
        DeliveryStatus.Delivered,
      ];

      if (!acceptableCurrentStatuses.includes(subOrder.deliveryStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Delivery cannot be confirmed unless it's marked as "Out for Delivery" or "Delivered".`,
        });
      }

      const currentDate = new Date();

      subOrder.customerConfirmedDelivery.confirmed = true;
      subOrder.customerConfirmedDelivery.confirmedAt = now;

      // Store previous status for logging
      const previousStatus = subOrder.deliveryStatus;

      // Update sub-order fields
      subOrder.deliveryStatus = deliveryStatus;
      subOrder.statusHistory.push({
        status: StatusHistory.Delivered,
        timestamp: currentDate,
        notes: `Delivery Confirmed by customer.`,
      }); // Here we push in this confirmation action.

      if (previousStatus === DeliveryStatus.OutForDelivery) {
        // Set delivery date and calculate return window
        subOrder.deliveryDate = currentDate;
      }

      // ==================== Stage 2: Financial Settlement ====================

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // --- Fetch the transaction record to get this suborder's settleAmount ---
        const transactionRecord = await getTransactionRecordByOrderId(
          mainOrderId,
          // NOTE: Pass session once helpers support it
        );

        if (!transactionRecord) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Transaction record not found for order ${mainOrderId}`,
          });
        }

        const breakdown = transactionRecord.suborderBreakdowns.find(
          (b) => b.suborderId.toString() === subOrderId,
        );

        if (!breakdown) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `No financial breakdown found for suborder ${subOrderId}`,
          });
        }

        // Guard: only settle suborders that are still in PENDING status.
        // Prevents double-settlement if this procedure is called more than once.
        if (breakdown.status !== SuborderFinancialStatus.PENDING) {
          // Suborder already settled, disputed, or refunded — skip financial writes
          // but still save the delivery confirmation on the order document
          await order.save({ session });
          await session.commitTransaction();
          return { success: true, message: "Delivery Confirmed." };
        }

        // --- FUNDS_RELEASED journal entry ---
        // Records the movement of vendor funds from VENDOR_PENDING to
        // VENDOR_AVAILABLE now that the customer has confirmed receipt.
        // Offsets: DEBIT VENDOR_AVAILABLE / CREDIT VENDOR_PENDING
        const writer = await JournalEntryWriter.init();

        await writer.writeFundsReleased({
          vendorId: breakdown.vendorId,
          settleAmount: breakdown.settleAmount,
          suborderId: breakdown.suborderId,
          triggeredBy: "CUSTOMER_CONFIRMATION",
          session,
        });

        // --- Update Transaction Record: suborder status → SETTLED ---
        await updateSuborderFinancialStatus(
          mainOrderId,
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

        // --- Save the order with delivery confirmation updates ---
        await order.save({ session });

        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }

      return {
        success: true,
        message: "Delivery Confirmed.",
      };
    }),
});
