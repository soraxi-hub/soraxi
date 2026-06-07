// Changes from the original:
// 1. Added FlutterwaveWebhookEvent import
// 2. Added PayoutWebhookHandler import
// 3. Added event type detection block BEFORE transaction verification
//    to route transfer events to PayoutWebhookHandler
// 4. Payment event flow is completely unchanged

import { connectToDatabase } from "@/lib/db/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { PaymentService } from "@/services/payment/payment.service";
import { FlutterwaveWebhookEvent } from "@/domain/payment/gateways/flutterwave.gateway";
import { PayoutWebhookHandler } from "@/services/payment/payout/payout-webhook-handler.service";
import { OrderFactory } from "@/domain/orders/order-factory";
import { CartService } from "@/services/cart/cart.service";
import { PaymentGateway } from "@/enums";

export async function POST(request: Request) {
  const requestBody = await request.json();
  const headers = request.headers;
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH_KEY;

  await connectToDatabase();

  try {
    if (!secretHash) {
      console.error("Missing required environment variables");
      throw new Error(
        "Server configuration error: Missing required FLUTTERWAVE environment variables",
      );
    }

    const signature = headers.get("verif-hash");

    if (!signature || signature !== secretHash) {
      return NextResponse.json(
        { message: "This request isn't from Flutterwave" },
        { status: 401 },
      );
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

    let session: mongoose.ClientSession | null = null;
    const processOrder = await OrderFactory.getProcessOrderInstance();
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      const transactionId: string = requestBody?.id || requestBody?.data?.id;
      if (!transactionId) {
        return NextResponse.json(
          { message: "Transaction ID missing in Flutterwave webhook payload" },
          { status: 400 },
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
        return NextResponse.json(
          { message: "Transaction not successful" },
          { status: 400 },
        );
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
        console.error(result.error);
        return NextResponse.json(
          {
            message:
              result.error ??
              "There is an issue updating order records via the webhook route.",
          },
          { status: 400 },
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
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    } finally {
      if (session) {
        session.endSession();
      }
    }
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
