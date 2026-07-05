import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { DeliveryStatus } from "@/enums";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import {
  getTransactionRecordByOrderId,
  updateSuborderFinancialStatus,
} from "@/lib/db/models/transaction-record.model";
import { releaseVendorPendingToAvailable } from "@/lib/db/models/vendor-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import { OrderFactory } from "@/domain/orders/order-factory";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import { OrderRepository } from "@/repositories/order.repository";

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
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, { source: "trpc:order.getByUserId" }),
          );
        } catch {
          // sendTelegramMessage already console.errors internally; never mask the original error
        }
      }
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
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, { source: "trpc:order.getByOrderId" }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
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
      const { mainOrderId, subOrderId } = input;

      try {
        if (
          !mongoose.Types.ObjectId.isValid(mainOrderId) ||
          !mongoose.Types.ObjectId.isValid(subOrderId)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid main Order ID or subOrder ID format",
          });
        }

        const orderDoc = await OrderRepository.getOrderById(mainOrderId, false);

        if (!orderDoc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Order with ID ${mainOrderId} not found`,
          });
        }

        // Resolve storeId from the sub-order — required by confirmDelivery().
        const rawSubOrder = orderDoc.subOrders.find(
          (sub) => sub._id.toString() === subOrderId,
        );

        if (!rawSubOrder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `The specified sub-order: ${subOrderId} could not be found.`,
          });
        }

        const storeId = rawSubOrder.storeId.toString();

        // ==================== Financial Settlement ====================
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          await orderService.confirmDelivery(
            input.mainOrderId,
            storeId,
            session,
          );

          const transactionRecord =
            await getTransactionRecordByOrderId(mainOrderId);

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

          if (breakdown.status !== SuborderFinancialStatus.PENDING) {
            await orderDoc.save({ session });
            await session.commitTransaction();
            return { success: true, message: "Delivery Confirmed." };
          }

          const writer = await JournalEntryWriter.init();

          await writer.writeFundsReleased({
            vendorId: breakdown.vendorId,
            settleAmount: breakdown.settleAmount,
            suborderId: breakdown.suborderId,
            triggeredBy: "CUSTOMER_CONFIRMATION",
            session,
          });

          await updateSuborderFinancialStatus(
            mainOrderId,
            subOrderId,
            SuborderFinancialStatus.SETTLED,
            session,
          );

          await releaseVendorPendingToAvailable(
            breakdown.vendorId.toString(),
            breakdown.settleAmount,
            session,
          );

          await orderDoc.save({ session });
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
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:order.customerConfirmedDelivery",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "Error in customerConfirmedDelivery procedure.",
        );
      }
    }),
});
