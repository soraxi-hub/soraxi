import { NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";
import { verifyPaystackTransaction } from "@/services/payment.service";

export async function POST(request: Request) {
  const requestBody = await request.json();
  const headers = request.headers;
  const secret = process.env.PAYSTACK_SECRET_KEY;
  let session: mongoose.ClientSession | null = null;

  try {
    if (!secret) {
      console.error("Missing required environment variables");
      throw new Error(
        "Server configuration error: Missing required PAYSTACK environment variables",
      );
    }

    // ✅ Step 1: Verify webhook signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(requestBody))
      .digest("hex");
    const signature = headers.get("x-paystack-signature");

    if (hash !== signature) {
      return NextResponse.json(
        { message: "This request isn't from Paystack" },
        { status: 401 },
      );
    }

    const transactionReference = requestBody.data.reference;

    // ✅ Step 2: Verify transaction
    const transactionData =
      await verifyPaystackTransaction(transactionReference);
    if (!transactionData) {
      return NextResponse.json(
        { message: "Failed to verify transaction" },
        { status: 400 },
      );
    }

    const { status, eventStatus } = transactionData;

    if (eventStatus !== true || status !== "success") {
      return NextResponse.json(
        { message: "Payment was not successful" },
        { status: 400 },
      );
    }

    // ✅ Step 4: Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      return NextResponse.json({
        message: "Order created and notifications sent successfully",
      });
    } catch (err) {
      if (session) await session.abortTransaction();
      console.error("Order creation failed:", err);
      return NextResponse.json(
        { error: "Something went wrong while saving the order" },
        { status: 500 },
      );
    } finally {
      if (session) session.endSession();
    }
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
