import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { DeliveryStatus, deliveryStatusLabel } from "@/enums";
import {
  NotificationFactory,
  renderTemplate,
  OrderStatusEmail,
  OrderFailureEmail,
} from "@/domain/notification";
import React from "react";
import { OrderFactory } from "@/domain/orders/order-factory";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import { OrderRepository } from "@/repositories/order.repository";
import { MessagingEvents } from "@/services/messaging/messaging-events";

export const orderStatusRouter = createTRPCRouter({
  /**
   * Update Order Status Procedure
   *
   * Provides comprehensive order status management functionality for store owners,
   * including delivery status updates, tracking number management, and order notes.
   */
  updateStatus: baseProcedure
    .input(
      z.object({
        orderId: z.string().min(1, "Order ID is required"),
        subOrderId: z.string().min(1, "Sub-order ID is required"),
        deliveryStatus: z.nativeEnum(DeliveryStatus),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // ==================== Environment Validation ====================
        if (!process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL) {
          console.error("Missing required environment variables");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Server configuration error: Missing required SORAXI EMAIL CONFIG environment variables",
          });
        }

        // ==================== Authentication & Authorization ====================
        const { store: storeSession } = ctx;

        if (!storeSession?.id) {
          console.warn("Unauthorized order status update attempt");
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store authentication required to update order status",
          });
        }

        // ==================== Parameter Validation ====================
        if (!mongoose.Types.ObjectId.isValid(input.orderId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid order ID format",
          });
        }

        // ==================== Database Operations ====================
        const orderDoc = await OrderRepository.getOrderById(
          input.orderId,
          true,
        );

        if (!orderDoc) {
          console.warn(`Order not found for status update: ${input.orderId}`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The requested order could not be found",
          });
        }

        // Verify store ownership
        const storeOwnsOrder = orderDoc.stores.some(
          (storeId) => storeId.toString() === storeSession.id,
        );

        if (!storeOwnsOrder) {
          console.warn(
            `Unauthorized order status update attempt: Store ${storeSession.id} tried to update order ${input.orderId}`,
          );
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this order",
          });
        }

        // ==================== Sub-Order Update (via domain) ====================
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          const orderService = OrderFactory.getOrderServiceInstance();

          await orderService.updateDeliveryStatus(
            input.orderId,
            storeSession.id,
            input.deliveryStatus,
            input.notes ??
              `Delivery updated to "${deliveryStatusLabel(input.deliveryStatus)}" by the store.`,
            session,
          );

          await session.commitTransaction();
        } catch (domainError) {
          await session.abortTransaction();
          // This branch always converts to a BAD_REQUEST below, so the real
          // cause (which may be a genuine DB/unexpected failure, not just an
          // invalid transition) would otherwise never reach the outer catch.
          if (isReportableError(domainError)) {
            try {
              await sendTelegramMessage(
                formatErrorReport(domainError, {
                  source:
                    "trpc:store.store-orders.order-status-management.updateStatus",
                }),
              );
            } catch {
              // sendTelegramMessage already console.errors; never mask the original error
            }
          }
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              domainError instanceof Error
                ? domainError.message
                : "Invalid status transition",
          });
        } finally {
          session.endSession();
        }

        // ==================== Messaging Event ====================
        // Published after the commit, never inside it: an event for a
        // rolled-back status change would announce something that never
        // happened. This module knows nothing about conversations — a
        // registered handler appends a notice if a thread already exists.
        await MessagingEvents.orderStatusChanged({
          subOrderId: input.subOrderId,
          orderId: input.orderId,
          statusLabel: deliveryStatusLabel(input.deliveryStatus),
        });

        // ==================== Email Notifications ====================
        try {
          const customerEmail = orderDoc.userSnapshot.email;

          const isOrderFailedOrCanceled =
            input.deliveryStatus === DeliveryStatus.Canceled ||
            input.deliveryStatus === DeliveryStatus.FailedDelivery;

          const statusSubject = isOrderFailedOrCanceled
            ? `Issue with your order "${input.subOrderId}"`
            : `Your order is now "${deliveryStatusLabel(input.deliveryStatus)}"`;

          const customerHtml = await renderTemplate(
            React.createElement(OrderStatusEmail, {
              customerName: orderDoc.userSnapshot.name,
              orderId: input.orderId,
              subOrderId: input.subOrderId,
              status: deliveryStatusLabel(input.deliveryStatus),
              storeName: storeSession.name.toUpperCase(),
              trackingUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${input.orderId}`,
            }),
          );

          const customerNotification = NotificationFactory.create("email", {
            recipient: customerEmail,
            subject: statusSubject,
            emailType: "storeOrderNotification",
            fromAddress: "orders@soraxihub.com",
            html: customerHtml,
            text: `Your order status has been updated to: ${deliveryStatusLabel(input.deliveryStatus)}`,
          });

          await customerNotification.send();

          if (isOrderFailedOrCanceled) {
            const adminEmail = process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL;

            const adminHtml = await renderTemplate(
              React.createElement(OrderFailureEmail, {
                deliveryStatus: deliveryStatusLabel(input.deliveryStatus),
                orderId: input.orderId,
                subOrderId: input.subOrderId,
                storeName: storeSession.name.toUpperCase(),
                customerEmail: customerEmail || "Unknown",
                reason: input.notes,
              }),
            );

            const adminNotification = NotificationFactory.create("email", {
              recipient: adminEmail,
              subject: `Order ${deliveryStatusLabel(input.deliveryStatus)} - ${input.subOrderId}`,
              emailType: "storeOrderNotification",
              fromAddress: "orders@soraxihub.com",
              html: adminHtml,
              text: `Order ${input.subOrderId} for store "${storeSession.name}" was marked as ${deliveryStatusLabel(input.deliveryStatus)}.`,
            });

            await adminNotification.send();
          }
        } catch (mailErr) {
          console.error("Failed to send status update email:", mailErr);
          if (isReportableError(mailErr)) {
            try {
              await sendTelegramMessage(
                formatErrorReport(mailErr, {
                  source:
                    "trpc:store.store-orders.order-status-management.updateStatus.emailNotify",
                }),
              );
            } catch {
              // sendTelegramMessage already console.errors; never mask the original error
            }
          }
        }

        return {
          success: true,
          message: `Order status updated to ${deliveryStatusLabel(input.deliveryStatus)}`,
        };
      } catch (error) {
        console.error("Order status update error:", error);

        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source:
                  "trpc:store.store-orders.order-status-management.updateStatus",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }

        if (error instanceof mongoose.Error.ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The provided data failed validation",
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update order status. Please try again later.",
        });
      }
    }),
});
