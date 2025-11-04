import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import mongoose from "mongoose";
import { getOrderModel } from "@/lib/db/models/order.model";
import { PaymentStatus } from "@/enums";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { FlutterwavePaymentService } from "@/domain/payments/flutterwave/payment";

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
      let session: mongoose.ClientSession | null = null;
      await connectToDatabase();
      const Order = await getOrderModel();

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

          if (verifiedTransaction?.data?.status.toLowerCase() === "pending") {
            return {
              ok: true,
              status: verifiedTransaction?.data?.status.toLowerCase(),
            };
          }

          session = await mongoose.startSession();
          session.startTransaction();

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

            // find order by ID
            const order = await Order.findById(
              new mongoose.Types.ObjectId(orderId)
            )
              .session(session)
              .select("paymentStatus expireAt");

            if (!order) {
              await session.abortTransaction();
              return { ok: false, error: "Order not found" };
            }

            if (
              order.paymentStatus === PaymentStatus.Failed ||
              order.paymentStatus === PaymentStatus.Cancelled
            ) {
              await session.abortTransaction();
              return { ok: true, status: order.paymentStatus };
            }

            order.expireAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

            if (transactionData.status.toLowerCase() === "failed") {
              order.paymentStatus = PaymentStatus.Failed;
            } else {
              order.paymentStatus = PaymentStatus.Cancelled;
            }

            await order.save({ session });
            await session.commitTransaction();

            return { ok: true, status: transactionData.status };
          }

          if (
            statusArr.includes(verifiedTransaction?.data?.status.toLowerCase())
          ) {
            const transactionData = verifiedTransaction.data;

            return { ok: true, status: transactionData.status };
          }

          return { ok: false, error: "failed to verify Transaction" };
        }

        if (!tx_ref) {
          return { ok: false, error: "tx_ref is required" };
        }

        const order = await Order.findOne({
          idempotencyKey: tx_ref,
        })
          .session(session)
          .select("paymentStatus expireAt");

        if (!order) {
          return { ok: false, error: "Order not found" };
        }

        if (
          order.paymentStatus === PaymentStatus.Paid ||
          order.paymentStatus === PaymentStatus.Failed ||
          order.paymentStatus === PaymentStatus.Cancelled
        ) {
          return { ok: true, status: order.paymentStatus };
        }

        session = await mongoose.startSession();
        session.startTransaction();

        order.expireAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

        order.paymentStatus = PaymentStatus.Cancelled;

        await order.save({ session });
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
