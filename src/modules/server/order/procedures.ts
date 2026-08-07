import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { DeliveryProofMethodEnum, DeliveryStatus } from "@/enums";
import { settleSuborder } from "@/services/orders/suborder-settlement.service";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
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

          // Record how delivery was proven. First-party confirmation from the
          // buyer's own account is the strongest evidence available, and the
          // admin dispute panel surfaces it as such.
          if (rawSubOrder.deliveryProof) {
            rawSubOrder.deliveryProof.method =
              DeliveryProofMethodEnum.CustomerInApp;
            rawSubOrder.deliveryProof.confirmedAt = new Date();
          }

          // Shared with the auto-confirm cron and the delivery-code path, so
          // the ledger, financial status and wallet move can never drift apart.
          await settleSuborder({
            orderId: mainOrderId,
            subOrderId,
            trigger: "CUSTOMER_CONFIRMATION",
            session,
          });

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
