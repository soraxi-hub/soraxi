import { connectToDatabase } from "@/lib/db/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { PaymentService } from "@/services/payment/payment.service";
import { FlutterwaveWebhookEvent } from "@/domain/payment/gateways/flutterwave.gateway";
import { PayoutWebhookHandler } from "@/services/payment/payout/payout-webhook-handler.service";
import { OrderFactory } from "@/domain/orders/order-factory";
import { CartService } from "@/services/cart/cart.service";
import { PaymentGateway } from "@/enums";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

export async function POST(request: Request) {
  const requestBody = await request.json();
  const headers = request.headers;
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH_KEY;

  await connectToDatabase();

  let session: mongoose.ClientSession | null = null;

  try {
    if (!secretHash) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Server configuration error: Missing required FLUTTERWAVE environment variables",
      );
    }

    const signature = headers.get("verif-hash");

    if (!signature || signature !== secretHash) {
      throw new AppError("UNAUTHORIZED", "This request isn't from Flutterwave");
    }

    // ----------------------------------------------------------------
    // ADD: Event type detection — route before any further processing
    //
    // Flutterwave sends an "event" field on every webhook payload.
    // We check it here and route accordingly before doing anything else.
    // ----------------------------------------------------------------
    const eventType = requestBody?.event as string | undefined;

    if (eventType === FlutterwaveWebhookEvent.TRANSFER_COMPLETED) {
      // --- Transfer event (Stage 6) ---
      // Route to PayoutWebhookHandler — completely separate from payment flow
      // No session needed here — PayoutWebhookHandler manages its own session
      const result = await PayoutWebhookHandler.handle(requestBody.data);

      return NextResponse.json(
        { message: result.message },
        { status: result.status ?? (result.ok ? 200 : 500) },
      );
    }

    const processOrder = await OrderFactory.getProcessOrderInstance();
    session = await mongoose.startSession();
    session.startTransaction();

    const transactionId: string = requestBody?.id || requestBody?.data?.id;
    if (!transactionId) {
      throw new AppError(
        "BAD_REQUEST",
        "Transaction ID missing in Flutterwave webhook payload",
        { transactionId },
      );
    }

    // Verify transaction with Flutterwave API
    const verifiedTransaction = await PaymentService.verifyPayment({
      gateway: PaymentGateway.Flutterwave,
      transactionReference: transactionId,
    });

    if (
      verifiedTransaction?.status.toLowerCase() !== "success" ||
      verifiedTransaction?.data?.status.toLowerCase() !== "successful"
    ) {
      throw new AppError("BAD_REQUEST", "Transaction not successful", {
        transactionStatus: verifiedTransaction?.data?.status,
      });
    }

    // Process the order based on transactionData
    const transactionData = verifiedTransaction.data;
    const { orderId, idempotencyKey } = transactionData.meta;
    const paymentMethod = transactionData.payment_type;

    const customerInfo = {
      fullName: transactionData.meta.fullName,
      email: transactionData.meta.email,
    };

    const result = await processOrder.updateOrderRecordToSuccessState({
      orderId,
      idempotencyKey,
      session,
      paymentMethod,
      customerInfo,
    });

    if (!result.ok) {
      throw new AppError(
        "BAD_REQUEST",
        result.error ??
          "There is an issue updating order records via the webhook route.",
        { orderId, idempotencyKey },
      );
    }

    if (result.userId) {
      CartService.clearCart(result.userId);
    }

    await session.commitTransaction();

    return NextResponse.json(
      { message: "Webhook processed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Webhook processing failed:", error);
    if (session) {
      await session.abortTransaction();
    }
    return handleApiError(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
