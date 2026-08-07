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
  OutForDeliveryEmail,
} from "@/domain/notification";
import { formatOrderNumber } from "@/lib/utils/order-number";
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
        // Declared outside the transaction block so the email step below can
        // read it. Never returned to the vendor.
        let issuedCode: string | undefined;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          const orderService = OrderFactory.getOrderServiceInstance();

          // `issuedCode` is populated only on the Shipped transition, which is
          // where the delivery code is minted. It exists solely so the customer
          // can be emailed it below and must never reach this vendor's response.
          const result = await orderService.updateDeliveryStatus(
            input.orderId,
            storeSession.id,
            input.deliveryStatus,
            input.notes ??
              `Delivery updated to "${deliveryStatusLabel(input.deliveryStatus)}" by the store.`,
            session,
          );

          issuedCode = result.issuedCode;

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

          // Shipping mints the delivery code. This is the one email that
          // carries it, and it goes to the customer only — a vendor able to
          // read the code could confirm their own delivery.
          //
          // It replaces the generic status email for this transition rather
          // than arriving alongside it: two emails about the same event, one of
          // which buries the code, is how the code gets missed at the gate.
          if (issuedCode) {
            const subOrderDoc = orderDoc.subOrders.find(
              (s) => s._id.toString() === input.subOrderId,
            );

            const codeHtml = await renderTemplate(
              React.createElement(OutForDeliveryEmail, {
                customerName: orderDoc.userSnapshot.name,
                storeName: storeSession.name,
                orderReference: formatOrderNumber(
                  input.subOrderId,
                  orderDoc.createdAt,
                ),
                deliveryCode: issuedCode,
                orderId: input.orderId,
                items:
                  subOrderDoc?.products.map((p) => ({
                    name: p.productSnapshot.name,
                    quantity: p.productSnapshot.quantity,
                    price: p.productSnapshot.price,
                  })) ?? [],
                total: subOrderDoc?.financials.vendorSettlementAmount ?? 0,
              }),
            );

            await NotificationFactory.create("email", {
              recipient: customerEmail,
              subject: "Your order is out for delivery",
              emailType: "storeOrderNotification",
              fromAddress: "orders@soraxihub.com",
              html: codeHtml,
              // Plain-text fallback carries the code too — some clients strip
              // HTML entirely, and a codeless fallback is worse than useless.
              text: `Your order is on its way. Your delivery code is ${issuedCode}. Give it to the delivery person only when your items are in your hands.`,
            }).send();
          }

          // Skipped when the code email above already covered this transition.
          // Two emails about the same event, one of which buries the code, is
          // how the code gets missed at the gate.
          if (!issuedCode) {
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
          }

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
