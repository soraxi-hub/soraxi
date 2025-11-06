import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import mongoose from "mongoose";
import { PaymentStatus } from "@/enums";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { FlutterwavePaymentService } from "@/domain/payments/flutterwave/payment";
import { OrderFactory } from "@/domain/orders/order-factory";
import { CartService } from "@/domain/cart/cart";

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
          { message: "Missing required transaction identifier" }
        )
    )
    .query(async ({ input }) => {
      const { tx_ref, withTransactionId, transaction_id } = input;
      const statusArr = ["successful", "completed", "success"];
      const flutterwaveService = new FlutterwavePaymentService();
      const processOrder = await OrderFactory.getProcessOrderInstance();
      let session: mongoose.ClientSession | null = null;
      await connectToDatabase();

      try {
        if (withTransactionId) {
          if (!transaction_id) {
            return { ok: false, error: "Transaction Id is required" };
          }

          const verifiedTransaction =
            await flutterwaveService.verifyTransaction(transaction_id);

          if (!verifiedTransaction) {
            return { ok: false, error: "Could not retrieve transaction data" };
          }

          // If the payment is in a pending state, return true and do not update the order record
          if (verifiedTransaction?.data?.status.toLowerCase() === "pending") {
            return {
              ok: true,
              status: verifiedTransaction?.data?.status.toLowerCase(),
            };
          }

          session = await mongoose.startSession();
          session.startTransaction();

          // If the verified transaction data status is not a success status,
          // update the order record to either failed or cancelled, with a TTD of 2 weeks.
          if (
            !statusArr.includes(verifiedTransaction?.data?.status.toLowerCase())
          ) {
            const transactionData = verifiedTransaction.data;

            if (!transactionData.meta?.orderId) {
              await session.abortTransaction();
              return {
                ok: false,
                error: "Missing order reference in transaction metadata",
              };
            }

            const { orderId } = transactionData.meta;
            const transactionDataStatus = transactionData.status;

            const result = await processOrder.updateOrderRecordToFailureState({
              orderId,
              session,
              transactionDataStatus,
            });

            if (!result.ok) {
              await session.abortTransaction();
              return { ok: false, error: result.error };
            }

            await session.commitTransaction();
            return { ok: true, status: result.status };
          }

          // If the verified transaction data status is a success status,
          // process the order.
          if (
            statusArr.includes(verifiedTransaction?.data?.status.toLowerCase())
          ) {
            const transactionData = verifiedTransaction.data;
            const { orderId, idempotencyKey } = transactionData.meta;
            const paymentMethod = transactionData.payment_type;

            // Get customer info from order
            const customerInfo = {
              fullName: transactionData.meta.fullName,
              email: transactionData.meta.email,
            };

            // Update the order record
            const result = await processOrder.updateOrderRecord({
              orderId,
              idempotencyKey,
              session,
              paymentMethod,
              customerInfo,
            });

            if (!result.ok) {
              console.error(result.error);
              return { ok: false, status: PaymentStatus.Failed };
            }

            // Step 4: Clear user's cart
            if (result.userId) {
              CartService.clearUserCart(result.userId);
            }

            await session.commitTransaction();
            return { ok: true, status: transactionData.status };
          }

          return { ok: false, error: "failed to verify Transaction" };
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
        throw handleTRPCError(
          error,
          "There was an error when trying to verify flutterwave Payment."
        );
      } finally {
        // Always end the session
        if (session) {
          await session.endSession();
        }
      }
    }),
});
