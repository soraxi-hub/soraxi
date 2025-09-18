import { PaymentStatus } from "@/enums";
import { clearUserCart } from "@/lib/db/models/cart.model";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { connectToDatabase } from "@/lib/db/mongoose";
import { sendMail } from "@/services/mail.service";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export interface FlutterwaveVerifyResponse {
  status: "success" | "error";
  message: string;
  data: FlutterwaveTransactionData;
}

export interface FlutterwaveTransactionData {
  id: number;
  tx_ref: string;
  flw_ref: string;
  device_fingerprint?: string;
  amount: number;
  currency: string;
  charged_amount: number;
  app_fee: number;
  merchant_fee: number;
  processor_response: string;
  auth_model?: string;
  ip?: string;
  narration?: string;
  status: "successful" | "failed" | "pending";
  payment_type: "card" | "bank_transfer" | "ussd" | "account" | string;
  created_at: string;
  account_id?: number;

  // Payment method details
  card?: {
    first_6digits: string;
    last_4digits: string;
    issuer: string;
    country: string;
    type: string;
    token?: string;
    expiry: string;
  };

  bank_transfer?: {
    account_number: string;
    bank_name: string;
    bank_code?: string;
  };

  ussd?: {
    code: string;
    bank: string;
  };

  // Meta data - most important for your app
  meta: {
    __CheckoutInitAddress?: string;
    email: string;
    phone_number: string;
    fullname: string;
    orderId: string; // 👈 Your DB link
    idempotencyKey: string; // 👈 Crucial for preventing duplicates
    [key: string]: any; // in case Flutterwave adds new fields
  };

  amount_settled?: number;

  customer?: {
    id: number;
    name: string;
    phone_number: string;
    email: string;
    created_at: string;
  };
}

export async function POST(request: Request) {
  const requestBody = await request.json();
  const headers = request.headers;
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH_KEY;

  // Step 1: Verify webhook signature
  const signature = headers.get("verif-hash");
  if (!signature || signature !== secretHash) {
    return NextResponse.json(
      { message: "This request isn't from Flutterwave" },
      { status: 401 }
    );
  }

  await connectToDatabase();
  let session: mongoose.ClientSession | null = null;
  session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transactionId: number = requestBody?.id || requestBody?.data?.id;
    if (!transactionId) {
      return NextResponse.json(
        { message: "Transaction ID missing in Flutterwave webhook payload" },
        { status: 400 }
      );
    }

    // Step 2: Verify transaction with Flutterwave API
    const verifiedTransaction = await verifyTransaction(transactionId);

    // console.log("Verified transaction data:", verifiedTransaction);

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

    const Order = await getOrderModel();
    const Store = await getStoreModel();

    // find order by ID
    const order = await Order.findById(
      new mongoose.Types.ObjectId(orderId)
    ).populate("subOrders.store");
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // check idempotencyKey to prevent duplicate processing
    if (order.idempotencyKey === idempotencyKey) {
      if (order.paymentStatus === PaymentStatus.Paid) {
        return NextResponse.json(
          { message: "Webhook already processed: order already paid" },
          { status: 200 }
        );
      }
      if (
        order.paymentStatus === PaymentStatus.Failed ||
        order.paymentStatus === PaymentStatus.Cancelled
      ) {
        return NextResponse.json(
          { message: "Webhook already processed: order in terminal state" },
          { status: 200 }
        );
      }
      // else → pending, allow update to continue
    }

    // update payment status
    order.paymentStatus = PaymentStatus.Paid;
    order.paymentMethod = paymentMethod;
    await order.save({ session });

    // ✅ Step 4: Notify stores
    for (const subOrder of order.subOrders) {
      const storeDoc = await Store.findById(subOrder.store).lean();
      //   subOrder.statusHistory.push({
      //     status: "Paid",
      //     notes: "Payment confirmed via Flutterwave webhook",
      //   });

      if (!storeDoc?.storeEmail) continue;

      const productListHTML = subOrder.products
        .map(
          (p) =>
            `<li><strong>${p.productSnapshot.name}</strong> - Quantity: ${p.productSnapshot.quantity}</li>`
        )
        .join("");

      await sendMail({
        email: storeDoc.storeEmail,
        emailType: "storeOrderNotification",
        fromAddress: "orders@soraxihub.com",
        subject: `New Order Received (Order ID: ${(
          order._id as mongoose.Types.ObjectId
        ).toString()})`,
        html: `
          <p>Hello,</p>
          <p>You have a new order with the following items:</p>
          <ul>${productListHTML}</ul>
          <p>Order ID: <strong>${(
            order._id as mongoose.Types.ObjectId
          ).toString()}</strong></p>
          <p>Please log in to your dashboard to view full details.</p>
        `,
      });
    }

    // ✅ Step 5: Optionally clear user's cart
    await clearUserCart(order.user.toString());
    await session.commitTransaction();

    return NextResponse.json(
      { message: "Webhook processed successfully" },
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

async function verifyTransaction(
  transactionId: number
): Promise<FlutterwaveVerifyResponse | null> {
  const res = await fetch(
    `${
      process.env.FLUTTERWAVE_API_URL || "https://api.flutterwave.com/v3"
    }/transactions/${transactionId}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      },
    }
  );

  if (!res.ok) {
    console.error("Failed to verify transaction:", res.statusText);
    return null;
  }

  return res.json();
}
