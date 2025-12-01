import { connectToDatabase } from "@/lib/db/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { FlutterwavePayment } from "@/domain/payments/flutterwave/payment";
import { OrderFactory } from "@/domain/orders/order-factory";
import { CartService } from "@/domain/cart/cart";

export async function POST(request: Request) {
  const requestBody = await request.json();
  const headers = request.headers;
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH_KEY;
  const flutterwaveService = new FlutterwavePayment();
  const processOrder = await OrderFactory.getProcessOrderInstance();
  let session: mongoose.ClientSession | null = null;
  await connectToDatabase();
  session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!secretHash) {
      console.error("Missing required environment variables");
      throw new Error(
        "Server configuration error: Missing required FLUTTERWAVE environment variables"
      );
    }

    // Step 1: Verify webhook signature
    const signature = headers.get("verif-hash");

    if (!signature || signature !== secretHash) {
      return NextResponse.json(
        { message: "This request isn't from Flutterwave" },
        { status: 401 }
      );
    }

    const transactionId: string = requestBody?.id || requestBody?.data?.id;
    if (!transactionId) {
      return NextResponse.json(
        { message: "Transaction ID missing in Flutterwave webhook payload" },
        { status: 400 }
      );
    }

    // Step 2: Verify transaction with Flutterwave API
    const verifiedTransaction =
      await flutterwaveService.verifyTransaction(transactionId);

    if (
      verifiedTransaction?.status.toLowerCase() !== "success" ||
      verifiedTransaction?.data?.status.toLowerCase() !== "successful"
    ) {
      return NextResponse.json(
        { message: "Transaction not successful" },
        { status: 400 }
      );
    }

    // Step 3: Process the order based on transactionData
    const transactionData = verifiedTransaction.data;
    const { orderId, idempotencyKey } = transactionData.meta;
    const paymentMethod = transactionData.payment_type;

    // Get customer info from order
    const customerInfo = {
      fullName: transactionData.meta.fullName,
      email: transactionData.meta.email,
    };

    // Update the order record
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
        { status: 400 }
      );
    }

    // Step 4: Clear user's cart
    if (result.userId) {
      CartService.clearUserCart(result.userId);
    }

    await session.commitTransaction();

    return NextResponse.json(
      {
        message: "Webhook processed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook processing failed:", error);
    // Rollback transaction if it was started
    if (session) {
      await session.abortTransaction();
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    // Always end the session
    if (session) {
      await session.endSession();
    }
  }
}

/**
 * This is something to look at as we scale and not now.
 */
// In src/app/api/webhooks/flutterwave/successful-payments/route.ts around lines
// 175-184 (and similarly 232-238), the code holds the DB transaction open while
// sending notifications and clearing the cart; refactor so you verify and start
// the DB session, perform and commit the order update inside the transaction, then
// after commit fire customer and store notifications (await in parallel with
// Promise.all) and perform cart clearing as a best‑effort operation outside the
// transaction; ensure notification/cart failures are logged and do not attempt to
// rollback the already committed transaction.
