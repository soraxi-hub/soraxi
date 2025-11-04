import React from "react";
import { PaymentStatus } from "@/enums";
import { clearUserCart } from "@/lib/db/models/cart.model";
import { getOrderModel, IOrder } from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { connectToDatabase } from "@/lib/db/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import {
  NotificationFactory,
  OrderConfirmationEmail,
  StoreOrderNotificationEmail,
  renderTemplate,
} from "@/domain/notification";
import {
  FlutterwavePaymentService,
  type FlutterwaveTransactionData,
} from "@/domain/payments/flutterwave/payment";

export async function POST(request: Request) {
  const requestBody = await request.json();
  const headers = request.headers;
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH_KEY;
  const flutterwaveService = new FlutterwavePaymentService();
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

    const Order = await getOrderModel();
    await getStoreModel();

    // find order by ID
    const order = await Order.findById(
      new mongoose.Types.ObjectId(orderId)
    ).populate("subOrders.storeId");

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

    // ✅ Step 4: Send notifications to both customer and stores
    const customerNotificationSent = await sendCustomerNotification(
      order,
      transactionData
    );
    const storeNotificationsSent = await sendStoreNotifications(
      order,
      transactionData
    );

    // ✅ Step 5: Optionally clear user's cart
    try {
      await clearUserCart(order.userId.toString());
    } catch (clearUserCartError) {
      console.error("Failed to clear user cart:", clearUserCartError);
    }
    await session.commitTransaction();

    return NextResponse.json(
      {
        message: "Webhook processed successfully",
        notifications: {
          customer: customerNotificationSent,
          stores: storeNotificationsSent,
        },
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

// New function to send customer notification
async function sendCustomerNotification(
  order: IOrder,
  transactionData: FlutterwaveTransactionData
): Promise<boolean> {
  try {
    // Prepare all order items for customer email
    const allOrderItems = order.subOrders.flatMap((subOrder) =>
      subOrder.products.map((p) => ({
        name: p.productSnapshot.name,
        quantity: p.productSnapshot.quantity,
        price: p.productSnapshot.price || 0,
      }))
    );

    // Calculate total for entire order
    const totalAmount = allOrderItems.reduce(
      (sum: number, item) => sum + item.price * item.quantity,
      0
    );

    // Render customer order confirmation email
    const customerHtml = await renderTemplate(
      React.createElement(OrderConfirmationEmail, {
        customerName: transactionData.meta.fullName || "Customer",
        orderId: (order._id as { toString: () => string }).toString(),
        items: allOrderItems,
        totalAmount: totalAmount,
        deliveryDate: undefined, // I can't really do this since the order contains multiple stores with different delivery estimates
      })
    );

    // Send customer notification
    const customerNotification = NotificationFactory.create("email", {
      recipient: transactionData.meta.email,
      subject: `Order Confirmation - ${(order._id as { toString: () => string }).toString()}`,
      emailType: "orderConfirmation",
      fromAddress: "orders@soraxihub.com",
      html: customerHtml,
      text: `Thank you for your order! Your order ID is ${(order._id as { toString: () => string }).toString()}. We'll notify you when your order ships.`,
    });

    await customerNotification.send();
    return true;
  } catch (error) {
    console.error("Failed to send customer notification:", error);
    return false;
  }
}

// New function to send store notifications (updated version)
async function sendStoreNotifications(
  order: IOrder,
  transactionData: FlutterwaveTransactionData
): Promise<number> {
  let successfulNotifications = 0;

  try {
    const Store = await getStoreModel();

    for (const subOrder of order.subOrders) {
      const storeDoc = await Store.findById(subOrder.storeId)
        .select("name storeEmail _id")
        .lean<{
          _id: mongoose.Types.ObjectId;
          name: string;
          storeEmail: string;
        }>();

      if (!storeDoc?.storeEmail) continue;

      // Prepare store-specific order items
      const storeOrderItems = subOrder.products.map((p) => ({
        name: p.productSnapshot.name,
        quantity: p.productSnapshot.quantity,
        price: p.productSnapshot.price || 0,
        productId: p.productId.toString(),
      }));

      // Calculate total for this store's sub-order
      const storeTotalAmount = storeOrderItems.reduce(
        (sum: number, item) => sum + item.price * item.quantity,
        0
      );

      // Get customer info from order
      const customerInfo = {
        name: transactionData.meta.fullName,
        email: transactionData.meta.email,
      };

      // Get delivery address from order
      const deliveryAddress = order.shippingAddress
        ? {
            street: order.shippingAddress.address,
            deliveryType: order.shippingAddress.deliveryType,
            country: "Nigeria",
            postalCode: order.shippingAddress.postalCode,
          }
        : undefined;

      // Render store notification email
      const storeHtml = await renderTemplate(
        React.createElement(StoreOrderNotificationEmail, {
          storeName: storeDoc.name,
          storeId: storeDoc._id.toString(),
          orderId: (order._id as { toString: () => string }).toString(),
          items: storeOrderItems,
          totalAmount: storeTotalAmount,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
          deliveryAddress: deliveryAddress,
        })
      );

      // Send store notification
      const storeNotification = NotificationFactory.create("email", {
        recipient: storeDoc.storeEmail,
        subject: `New Order Received - ${(order._id as { toString: () => string }).toString()}`,
        emailType: "storeOrderNotification",
        fromAddress: "orders@soraxihub.com",
        html: storeHtml,
        text: `You have received a new order with ID: ${(order._id as { toString: () => string }).toString()}. Please log in to your dashboard to view details.`,
      });

      await storeNotification.send();
      successfulNotifications++;
    }
  } catch (error) {
    console.error("Failed to send store notifications:", error);
  }

  return successfulNotifications;
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
