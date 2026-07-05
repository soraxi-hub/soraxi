import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import mongoose from "mongoose";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { AdminGuard } from "@/domain/admin/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getTransactionRecordByOrderId } from "@/lib/db/models/transaction-record.model";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import { OrderFactory } from "@/domain/orders/order-factory";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

const orderService = OrderFactory.getOrderServiceInstance();
/**
 * Admin Orders TRPC Router
 */
export const adminOrdersRouter = createTRPCRouter({
  listOrders: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;
      try {
        // ==================== Authentication & Authorization ====================
        AdminGuard.from(unAuthenticatedAdmin).require(PERMISSIONS.VIEW_ORDERS);

        const result = await orderService.getOrdersAdminView({
          startDate: input.fromDate,
          endDate: input.toDate,
          deliveryStatus: input.status,
          page: input.page,
          limit: input.limit,
        });

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        // ==================== Error Handling ====================
        /**
         * Comprehensive Error Handling
         */
        console.error("Admin orders fetch error:", error);

        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:admin.orders.listOrders",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }

        if (error instanceof mongoose.Error.ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The request contains invalid data",
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch orders. Please try again later.",
        });
      }
    }),

  getAdminOrderById: baseProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        const { admin: unAuthenticatedAdmin } = ctx;
        AdminGuard.from(unAuthenticatedAdmin).require(PERMISSIONS.VIEW_ORDERS);

        if (!mongoose.Types.ObjectId.isValid(input.orderId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid order ID format.",
          });
        }

        await connectToDatabase();
        const Order = await getOrderModel();

        const order = await Order.findById(input.orderId)
          .populate({
            path: "userId",
            select: "firstName lastName email phoneNumber",
          })
          .populate({
            path: "subOrders.storeId",
            select: "name storeEmail",
          })
          .lean();

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }

        // Fetch financial statuses for all suborders
        const transactionRecord = await getTransactionRecordByOrderId(
          input.orderId,
        );

        const financialStatuses: Record<
          string,
          {
            status: string;
            grossAmount: number;
            commission: number;
            settleAmount: number;
            disputeId: string | null;
          }
        > = {};

        if (transactionRecord) {
          const { getActiveDisputeBySuborderId } = await import(
            "@/lib/db/models/dispute-record.model"
          );

          for (const breakdown of transactionRecord.suborderBreakdowns) {
            const suborderId = breakdown.suborderId.toString();
            let disputeId: string | null = null;

            if (breakdown.status === SuborderFinancialStatus.DISPUTED) {
              const activeDispute =
                await getActiveDisputeBySuborderId(suborderId);
              disputeId = activeDispute
                ? (activeDispute._id as mongoose.Types.ObjectId).toString()
                : null;
            }

            financialStatuses[suborderId] = {
              status: breakdown.status,
              grossAmount: breakdown.grossAmount,
              commission: breakdown.commission,
              settleAmount: breakdown.settleAmount,
              disputeId,
            };
          }
        }

        const user = order.userId as any;

        return {
          orderId: (order._id as mongoose.Types.ObjectId).toString(),
          orderNumber: `ORD-${(order._id as mongoose.Types.ObjectId).toString().slice(-8).toUpperCase()}`,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          notes: order.notes ?? null,
          shippingAddress: order.shippingAddress,
          customer: {
            id: user?._id?.toString() ?? order.userId.toString(),
            name: user ? `${user.firstName} ${user.lastName}` : "Unknown",
            email: user?.email ?? "Unknown",
            phone: user?.phoneNumber ?? null,
          },
          subOrders: order.subOrders.map((sub) => {
            const store = sub.storeId as any;
            const suborderId = sub._id?.toString() ?? "";
            return {
              subOrderId: suborderId,
              storeName: store?.name ?? "Unknown Store",
              storeEmail: store?.storeEmail ?? null,
              deliveryStatus: sub.deliveryStatus,
              totalAmount: sub.financials.subtotal,
              shippingMethod: sub.shippingMethod ?? null,
              deliveryDate: sub.deliveryDate ?? null,
              customerConfirmedDelivery: sub.customerConfirmedDelivery,
              financialStatus: financialStatuses[suborderId] ?? null,
              products: sub.products.map((p) => ({
                name: p.productSnapshot.name,
                quantity: p.productSnapshot.quantity,
                price: p.productSnapshot.price,
                image: p.productSnapshot.images?.[0] ?? null,
              })),
              statusHistory: sub.statusHistory.map((h) => ({
                status: h.status,
                timestamp: h.timestamp,
                notes: h.notes ?? null,
              })),
            };
          }),
          flutterwaveReference: transactionRecord?.flutterwaveReference ?? null,
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:admin.orders.getAdminOrderById",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(error, "Failed to fetch order details.");
      }
    }),
});
