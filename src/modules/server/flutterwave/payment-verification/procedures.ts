import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import mongoose from "mongoose";
import { PaymentGateway, PaymentStatus } from "@/enums";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { OrderFactory } from "@/domain/orders/order-factory";
import { CartService } from "@/services/cart/cart.service";
import { PaymentGatewayFactory } from "@/domain/payment/payment.factory";
import { NormalizedPaymentStatus } from "@/domain/payment/gateways/gateway-interface";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

export const flutterwavePaymentVerificationRouter = createTRPCRouter({
  verifyPayment: baseProcedure
    .input(
      z
        .object({
          tx_ref: z.string().optional(),
          transaction_id: z.string().optional(),
          withTransactionId: z.boolean(),
        })
        .refine(
          (data) =>
            data.withTransactionId ? !!data.transaction_id : !!data.tx_ref,
          { message: "Missing required transaction identifier" },
        ),
    )
    .query(async ({ input }) => {
      const { tx_ref, withTransactionId, transaction_id } = input;
      const flutterwaveService = PaymentGatewayFactory.getGateway(
        PaymentGateway.Flutterwave,
      );
      const processOrder = await OrderFactory.getProcessOrderInstance();
      let session: mongoose.ClientSession | null = null;
      await connectToDatabase();

      try {
        if (withTransactionId) {
          if (!transaction_id) {
            return { ok: false, error: "Transaction Id is required" };
          }

          // The adapter returns the gateway-neutral result — status already
          // normalized, fees and amounts already in Kobo.
          const verified =
            await flutterwaveService.verifyPayment(transaction_id);

          if (!verified) {
            return { ok: false, error: "Could not retrieve transaction data" };
          }

          // If the payment is in a pending state, return true and do not update the order record
          if (verified.status === NormalizedPaymentStatus.Pending) {
            return { ok: true, status: verified.rawStatus };
          }

          session = await mongoose.startSession();
          session.startTransaction();

          // If the verified transaction did not succeed, update the order
          // record to either failed or cancelled, with a TTD of 2 weeks.
          if (verified.status === NormalizedPaymentStatus.Failed) {
            if (!verified.meta.orderId) {
              await session.abortTransaction();
              return {
                ok: false,
                error: "Missing order reference in transaction metadata",
              };
            }

            const result = await processOrder.updateOrderRecordToFailureState({
              orderId: verified.meta.orderId,
              session,
              transactionDataStatus: verified.rawStatus,
            });

            if (!result.ok) {
              await session.abortTransaction();
              return { ok: false, error: result.error };
            }

            await session.commitTransaction();
            return { ok: true, status: result.status };
          }

          // Successful transaction — process the order.
          const { collectionFeeKobo, gatewayTransactionId, paymentMethod } =
            verified;
          const { orderId, idempotencyKey } = verified.meta;

          const customerInfo = {
            fullName: verified.meta.fullName,
            email: verified.meta.email,
          };

          // Update the order record
          const result = await processOrder.updateOrderRecordToSuccessState({
            orderId,
            idempotencyKey,
            transactionId: Number(gatewayTransactionId),
            session,
            paymentMethod,
            customerInfo,
            collectionFeeKobo,
          });

          if (!result.ok) {
            console.error(result.error);
            return { ok: false, status: PaymentStatus.Failed };
          }

          // Step 4: Clear user's cart
          if (result.userId) {
            CartService.clearCart(result.userId);
          }

          await session.commitTransaction();
          return { ok: true, status: verified.rawStatus };
        }

        if (!tx_ref) {
          return { ok: false, error: "tx_ref is required" };
        }

        session = await mongoose.startSession();
        session.startTransaction();

        const result = await processOrder.handleCancelledOrder({
          tx_ref,
          session,
        });

        if (!result.ok) {
          return { ok: false, error: result.error };
        }

        await session.commitTransaction();
        return { ok: true, status: PaymentStatus.Cancelled };
      } catch (error) {
        // Rollback transaction if it was started
        if (session) {
          await session.abortTransaction();
        }
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:flutterwave.payment-verification.verifyPayment",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "There was an error when trying to verify flutterwave Payment.",
        );
      } finally {
        // Always end the session
        if (session) {
          await session.endSession();
        }
      }
    }),
});
