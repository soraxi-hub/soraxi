import { NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";
import { verifyPaystackTransaction } from "@/services/payment.service";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { sendMail } from "@/services/mail.service";
import { calculateEstimatedDeliveryDays } from "@/lib/utils/calculate-est-delivery-days";

interface NotificationItem {
  storeEmail: string;
  orderId?: string;
  products: {
    productName: string;
    quantity: number;
  }[];
}

export async function POST(request: Request) {
  const requestBody = await request.json();
  const headers = request.headers;
  const secret = process.env.PAYSTACK_SECRET_KEY!;

  // ✅ Step 1: Verify webhook signature
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(requestBody))
    .digest("hex");
  const signature = headers.get("x-paystack-signature");

  if (hash !== signature) {
    return NextResponse.json(
      { message: "This request isn't from Paystack" },
      { status: 401 }
    );
  }

  let session: mongoose.ClientSession | null = null;

  try {
    const transactionReference = requestBody.data.reference;

    // ✅ Step 2: Verify transaction
    const transactionData = await verifyPaystackTransaction(
      transactionReference
    );
    if (!transactionData) {
      return NextResponse.json(
        { message: "Failed to verify transaction" },
        { status: 400 }
      );
    }

    const { status, eventStatus, metadata, amount, channel } = transactionData;

    const cartItems = metadata.itemsInCart;
    const userID = metadata.userID;

    if (eventStatus !== true || status !== "success") {
      return NextResponse.json(
        { message: "Payment was not successful" },
        { status: 400 }
      );
    }

    // ✅ Step 3: Bulk fetch stores
    const Store = await getStoreModel();
    const storeIDs = [...new Set(cartItems.map((s) => s.storeID))];
    const storeDocs = await Store.find({ _id: { $in: storeIDs } }).lean();
    const storeMap = new Map(
      storeDocs.map((s) => [s._id.toString(), s.storeEmail])
    );

    const notifications: Record<string, NotificationItem> = {};

    // ✅ Step 4: Start transaction
    session = await mongoose.startSession();
    session.startTransaction();

    try {
      const Order = await getOrderModel();

      const subOrders = cartItems.map((store) => {
        const products = store.products.map((item) => {
          const base = {
            Product: item.product._id,
            store: item.storeID,
            quantity: Number(item.quantity),
            price: Number(item.selectedSize?.price || item.product.price),
          };

          if (item.selectedSize) {
            return {
              ...base,
              selectedSize: {
                size: item.selectedSize.size,
                price: Number(item.selectedSize.price),
              },
            };
          }

          return base;
        });

        const storeTotal = products.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        // Build notification for this store
        const productSummaries = store.products.map((item) => ({
          productName: item.product.name,
          quantity: Number(item.quantity),
        }));

        notifications[store.storeID] = {
          storeEmail: storeMap.get(store.storeID) ?? "",
          products: productSummaries,
        };

        return {
          store: store.storeID,
          products,
          totalAmount: storeTotal,
          deliveryStatus: "Order Placed",
          shippingMethod: {
            name: store.selectedShippingMethod?.name,
            price: Number(store.selectedShippingMethod?.price || 0),
            estimatedDeliveryDays: calculateEstimatedDeliveryDays(
              Number(store.selectedShippingMethod?.estimatedDeliveryDays || 5)
            ),
            description: store.selectedShippingMethod?.description,
          },
          escrow: {
            held: true,
            released: false,
            refunded: false,
          },
        };
      });

      // ✅ Step 5: Create and save main order
      const orderDoc = new Order({
        user: userID,
        stores: storeIDs,
        subOrders,
        totalAmount: amount,
        shippingAddress: {
          postalCode: metadata.postal_code,
          address: `${metadata.state}, ${metadata.city}, ${metadata.address}`,
        },
        paymentMethod: channel,
        paymentStatus: "Paid",
      });

      const savedOrder = (await orderDoc.save({
        session,
      })) as mongoose.Document & { _id: mongoose.Types.ObjectId };

      // ✅ Step 6: Commit transaction
      await session.commitTransaction();

      // ✅ Step 7: Send email notifications
      for (const storeID in notifications) {
        const { storeEmail, products } = notifications[storeID];
        const orderId = savedOrder._id.toString();
        notifications[storeID].orderId = orderId;

        if (!storeEmail) continue;

        const productListHTML = products
          .map(
            (p) =>
              `<li><strong>${p.productName}</strong> - Quantity: ${p.quantity}</li>`
          )
          .join("");

        await sendMail({
          email: storeEmail,
          emailType: "storeOrderNotification",
          subject: `New Order Received (Order ID: ${orderId})`,
          html: `
                  <p>Hello,</p>
                  <p>You have a new order with the following items:</p>
                  <ul>${productListHTML}</ul>
                  <p>Order ID: <strong>${orderId}</strong></p>
                  <p>Please log in to your dashboard to view full details.</p>
                `,
        });
      }

      return NextResponse.json({
        message: "Order created and notifications sent successfully",
        order: savedOrder,
      });
    } catch (err) {
      if (session) await session.abortTransaction();
      console.error("Order creation failed:", err);
      return NextResponse.json(
        { error: "Something went wrong while saving the order" },
        { status: 500 }
      );
    } finally {
      if (session) session.endSession();
    }
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
