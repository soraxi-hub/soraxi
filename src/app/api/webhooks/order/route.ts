import { NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";
import { verifyPaystackTransaction } from "@/services/payment.service";
import { getOrderModel } from "@/lib/db/models/order.model";

export async function POST(request: Request) {
  const requestBody = await request.json();
  const headers = request.headers;
  const secret = process.env.PAYSTACK_SECRET_KEY!;

  // Verify webhook signature
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

    const transactionData = await verifyPaystackTransaction(
      transactionReference
    );

    if (!transactionData) {
      return NextResponse.json(
        { message: "Failed to verify transaction" },
        { status: 400 }
      );
    }

    const {
      status,
      eventStatus,
      metadata,
      amount,
      channel,
      customer: paystackCustomer,
    } = transactionData; // paystackCustomer because this info is from Paystack.

    const cartItems = metadata.itemsInCart;
    const userID = metadata.userID;

    if (eventStatus === true && status === "success") {
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

          return {
            store: store.storeID,
            products,
            totalAmount: storeTotal,
            deliveryStatus: "Order Placed",
            shippingMethod: {
              name: store.selectedShippingMethod?.name,
              price: Number(store.selectedShippingMethod?.price || 0),
              estimatedDeliveryDays:
                store.selectedShippingMethod?.estimatedDeliveryDays,
              description: store.selectedShippingMethod?.description,
            },
            escrow: {
              held: true,
              released: false,
              refunded: false,
            },
            returnWindow: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          };
        });

        const orderDoc = new Order({
          user: userID,
          stores: cartItems.map((store) => store.storeID),
          subOrders,
          totalAmount: amount,
          shippingAddress: {
            postalCode: metadata.postal_code,
            address: `${metadata.state}, ${metadata.city}, ${metadata.address}`,
          },
          paymentMethod: channel,
          paymentStatus: "Paid",
        });

        const savedOrder = await orderDoc.save({ session });

        await session.commitTransaction();

        return NextResponse.json({
          message: "Order created successfully",
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
    } else {
      return NextResponse.json(
        { message: "Payment was not successful" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return NextResponse.json(
      { error: "Error verifying transaction" },
      { status: 500 }
    );
  }
}
