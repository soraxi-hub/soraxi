import { z } from "zod";
import mongoose from "mongoose";
import { TRPCError } from "@trpc/server";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { PaymentGateway, PaymentStatus } from "@/enums";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getOrderModel } from "@/lib/db/models/order.model";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { PaymentConfirmationService } from "@/services/payment/payment-confirmation.service";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * Checkout status endpoints.
 *
 * The status page polls `getStatus` — a fast, read-only lookup against our own
 * database.
 */

/** Shape returned to the status page. Deliberately free of gateway detail. */
interface OrderStatusResult {
  reference: string;
  paymentStatus: PaymentStatus;
  orderId: string;
  /** True once the order has left Pending — the page can stop polling. */
  isSettled: boolean;
}

/**
 * Load an order by reference and assert the caller owns it.
 *
 * Ownership is checked rather than assumed: the reference alone must not be
 * enough to read or act on someone else's order.
 */
async function loadOwnedOrder(reference: string, userId: string | undefined) {
  if (!userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to view this payment.",
    });
  }

  await connectToDatabase();
  const Order = await getOrderModel();

  const order = await Order.findOne({ idempotencyKey: reference })
    .select("_id userId paymentStatus paymentGateway")
    .lean<{
      _id: mongoose.Types.ObjectId;
      userId: mongoose.Types.ObjectId;
      paymentStatus: PaymentStatus;
      paymentGateway?: PaymentGateway;
    }>();

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "We couldn't find a payment with that reference.",
    });
  }

  if (order.userId.toString() !== userId) {
    // Deliberately NOT_FOUND rather than FORBIDDEN: confirming that a
    // reference exists would leak information to someone probing references.
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "We couldn't find a payment with that reference.",
    });
  }

  return order;
}

export const orderStatusRouter = createTRPCRouter({
  /**
   * Read the current payment status. Pure DB read — safe to poll every few
   * seconds and safe to refetch on window focus.
   */
  getStatus: baseProcedure
    .input(z.object({ reference: z.string().min(1) }))
    .query(async ({ input, ctx }): Promise<OrderStatusResult> => {
      try {
        const order = await loadOwnedOrder(input.reference, ctx.user?.id);

        return {
          reference: input.reference,
          paymentStatus: order.paymentStatus,
          orderId: order._id.toString(),
          isSettled: order.paymentStatus !== PaymentStatus.Pending,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw handleTRPCError(
          error,
          "There was an error checking your payment status.",
        );
      }
    }),

  /**
   * Fallback confirmation: verify directly against the gateway and settle the
   * order if the gateway has a verdict.
   *
   * The status page calls this once, after the webhook has had a few seconds
   * to land. A mutation, not a query, because it can write — the previous
   * design performed financial writes from a query that React Query refetched
   * on every window focus.
   *
   * Safe to call redundantly: confirmation is idempotent, and an order the
   * webhook already settled short-circuits before any gateway call.
   */
  forceVerify: baseProcedure
    .input(z.object({ reference: z.string().min(1) }))
    .mutation(async ({ input, ctx }): Promise<OrderStatusResult> => {
      try {
        const order = await loadOwnedOrder(input.reference, ctx.user?.id);

        // Already settled — skip the gateway round trip entirely.
        if (order.paymentStatus !== PaymentStatus.Pending) {
          return {
            reference: input.reference,
            paymentStatus: order.paymentStatus,
            orderId: order._id.toString(),
            isSettled: true,
          };
        }

        const result = await PaymentConfirmationService.confirmFromGateway({
          reference: input.reference,
          gateway: order.paymentGateway,
        });

        // A gateway that cannot be reached is not a client error — the order
        // stays pending and the page keeps polling for the webhook.
        const paymentStatus = result.ok ? result.status : PaymentStatus.Pending;

        if (!result.ok) {
          console.error(
            `[orderStatus.forceVerify] ${input.reference}: ${result.error}`,
          );
        }

        return {
          reference: input.reference,
          paymentStatus,
          orderId: order._id.toString(),
          isSettled: paymentStatus !== PaymentStatus.Pending,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:orderStatus.forceVerify",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original
          }
        }
        throw handleTRPCError(
          error,
          "There was an error verifying your payment.",
        );
      }
    }),
});
