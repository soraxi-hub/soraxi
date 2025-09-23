import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getOrderById, getOrderModel } from "@/lib/db/models/order.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { IUser } from "@/lib/db/models/user.model";
import {
  generateAdminOrderFailureHtml,
  generateOrderStatusHtml,
  sendMail,
} from "@/services/mail.service";
import { DeliveryStatus, deliveryStatusLabel, StatusHistory } from "@/enums";

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
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
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
        const order = await getOrderById(input.orderId);

        if (!order) {
          console.warn(`Order not found for status update: ${input.orderId}`);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The requested order could not be found",
          });
        }

        // Verify store ownership
        const storeOwnsOrder = order.stores.some(
          (storeId) => storeId.toString() === storeSession.id
        );

        if (!storeOwnsOrder) {
          console.warn(
            `Unauthorized order status update attempt: Store ${storeSession.id} tried to update order ${input.orderId}`
          );
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to update this order",
          });
        }

        // ==================== Sub-Order Update ====================
        const subOrder = order.subOrders.find(
          (sub) => sub._id?.toString() === input.subOrderId
        );

        if (!subOrder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The specified sub-order could not be found",
          });
        }

        // Store previous status for logging
        const previousStatus = subOrder.deliveryStatus;

        // Update sub-order fields
        subOrder.deliveryStatus = input.deliveryStatus;
        // Prepare the status history update
        const statusUpdate = {
          status: input.deliveryStatus as unknown as StatusHistory,
          timestamp: new Date(),
          notes: `Delivery updated to "${deliveryStatusLabel(
            input.deliveryStatus
          )}" by the store.`,
        };
        subOrder.statusHistory.push(statusUpdate);

        // ==================== Status-Specific Logic ====================
        const currentDate = new Date();

        switch (input.deliveryStatus) {
          case DeliveryStatus.Delivered:
            // Set delivery date and calculate return window
            subOrder.deliveryDate = currentDate;
            subOrder.returnWindow = new Date(
              currentDate.getTime() + 7 * 24 * 60 * 60 * 1000
            ); // 7 days
            break;

          case DeliveryStatus.Canceled:
          case DeliveryStatus.Returned:
          case DeliveryStatus.FailedDelivery:
            // Mark for review — admin must manually trigger refund later
            if (subOrder.escrow) {
              subOrder.escrow.refundReason =
                input.notes ||
                `Marked for review: ${deliveryStatusLabel(
                  input.deliveryStatus
                )}`;
            }
            break;

          case DeliveryStatus.Refunded:
            // Complete refund — this is the only place refund actually happens
            if (subOrder.escrow) {
              subOrder.escrow.held = false;
              subOrder.escrow.released = false;
              subOrder.escrow.refunded = true;
              subOrder.escrow.refundReason = input.notes || "Order refunded";
            }
            break;
        }

        // ==================== Save Changes ====================
        await order.save();

        // ==================== Audit Logging ====================
        console.log(
          `Order status updated: ${input.orderId} | Sub-order: ${input.subOrderId} | ` +
            `Store: ${storeSession.id} | Status: ${previousStatus} → ${input.deliveryStatus}`
        );

        // ==================== Email Notifications ====================
        try {
          const Order = await getOrderModel();
          const orderDoc = await Order.findById(input.orderId)
            .populate({
              path: "userId",
              select: "email",
            })
            .select("userId");

          const customerEmail = (orderDoc?.userId as unknown as IUser)?.email;

          if (!orderDoc || !orderDoc.userId) {
            console.log("Failed to fetch order or user ID");
          } else {
            const isOrderFailedOrCanceled =
              input.deliveryStatus === DeliveryStatus.Canceled ||
              input.deliveryStatus === DeliveryStatus.FailedDelivery;

            const statusSubject = isOrderFailedOrCanceled
              ? `Issue with your order "${input.subOrderId}"`
              : `Your order is now "${deliveryStatusLabel(
                  input.deliveryStatus
                )}"`;

            const statusHtml = generateOrderStatusHtml({
              status: deliveryStatusLabel(input.deliveryStatus),
              orderId: input.orderId,
              subOrderId: input.subOrderId,
              storeName: storeSession.name.toUpperCase(),
            });

            await sendMail({
              email: customerEmail,
              emailType: "storeOrderNotification",
              fromAddress: "orders@soraxihub.com",
              subject: statusSubject,
              html: statusHtml,
              text: `Your order status has been updated to: ${deliveryStatusLabel(
                input.deliveryStatus
              )}`,
            });

            if (isOrderFailedOrCanceled) {
              const adminEmail = process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL!;
              const adminHtml = generateAdminOrderFailureHtml({
                deliveryStatus: deliveryStatusLabel(input.deliveryStatus),
                orderId: input.orderId,
                subOrderId: input.subOrderId,
                storeName: storeSession.name,
                customerEmail: customerEmail || "Unknown",
              });

              await sendMail({
                email: adminEmail,
                emailType: "storeOrderNotification",
                fromAddress: "orders@soraxihub.com",
                subject: `Order ${deliveryStatusLabel(
                  input.deliveryStatus
                )} - ${input.subOrderId}`,
                html: adminHtml,
                text: `Order ${input.subOrderId} for store "${
                  storeSession.name
                }" was marked as ${deliveryStatusLabel(input.deliveryStatus)}.`,
              });

              console.log(
                `Admin notified for ${deliveryStatusLabel(
                  input.deliveryStatus
                )} case`
              );
            }
          }
        } catch (mailErr) {
          console.error("Failed to send status update email:", mailErr);
        }

        return {
          success: true,
          message: `Order status updated to ${deliveryStatusLabel(
            input.deliveryStatus
          )}`,
          updates: {
            orderId: input.orderId,
            subOrderId: input.subOrderId,
            previousStatus,
            newStatus: deliveryStatusLabel(input.deliveryStatus),
            deliveryDate: subOrder.deliveryDate?.toISOString() || null,
            updatedAt: currentDate.toISOString(),
          },
        };
      } catch (error) {
        console.error("Order status update error:", error);

        if (error instanceof mongoose.Error.ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The provided data failed validation",
          });
        }

        if (error instanceof mongoose.Error.CastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more fields have invalid format",
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

  /**
   * Get Order Status History Procedure
   *
   * Retrieves the complete status change history for an order,
   * providing audit trail and tracking information.
   */
  getStatusHistory: baseProcedure
    .input(
      z.object({
        orderId: z.string().min(1, "Order ID is required"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { store: storeSession } = ctx;

        if (!storeSession?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store authentication required",
          });
        }

        // Parameter validation
        if (!mongoose.Types.ObjectId.isValid(input.orderId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid order ID format",
          });
        }

        // Fetch order
        const order = await getOrderById(input.orderId, true);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }

        // Verify store ownership
        const storeOwnsOrder = order.stores.some(
          (storeId) => storeId.toString() === storeSession.id
        );

        if (!storeOwnsOrder) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }

        // Format status history
        const statusHistory = order.subOrders.map((subOrder, index) => ({
          subOrderId: subOrder._id?.toString(),
          subOrderIndex: index + 1,
          currentStatus: subOrder.deliveryStatus,
          deliveryDate: subOrder.deliveryDate?.toISOString() || null,
          escrowStatus: {
            held: subOrder.escrow?.held || false,
            released: subOrder.escrow?.released || false,
            refunded: subOrder.escrow?.refunded || false,
          },
          returnWindow: subOrder.returnWindow?.toISOString() || null,
        }));

        return {
          success: true,
          orderId: input.orderId,
          statusHistory,
          orderCreatedAt: order.createdAt.toISOString(),
          lastUpdatedAt: order.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("Order status history fetch error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch status history. Please try again later.",
        });
      }
    }),
});
