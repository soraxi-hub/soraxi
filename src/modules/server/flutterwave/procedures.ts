import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getCartByUserId } from "@/lib/db/models/cart.model";
import { calculateEstimatedDeliveryDays } from "@/lib/utils/calculate-est-delivery-days";
import mongoose from "mongoose";
import { generateUniqueId } from "@/lib/utils";
import { koboToNaira } from "@/lib/utils/naira";
import {
  DeliveryStatus,
  DeliveryType,
  PaymentGateway,
  PaymentStatus,
  StatusHistory,
} from "@/enums";

// Define the Zod schema for validation
const flutterwaveInputSchema = z.object({
  amount: z.number(),
  cartItemsWithShippingMethod: z.array(
    z.object({
      selectedShippingMethod: z
        .object({
          name: z.string(),
          price: z.number(),
          description: z.string().optional(),
          estimatedDeliveryDays: z.number().optional(),
        })
        .optional(), // optional because a store may not have any shipping methods yet. fix it before you go live
      storeID: z.string(),
      storeName: z.string(),
      products: z.array(
        z.object({
          product: z.object({
            _id: z.string(),
            storeID: z.string(),
            productType: z.string(),
            name: z.string(),
            price: z.number().optional(),
            sizes: z
              .array(
                z.object({
                  size: z.string(),
                  price: z.number(),
                  quantity: z.number(),
                })
              )
              .optional(),
            images: z.array(z.string()),
            category: z.array(z.string()),
          }),
          quantity: z.number(),
          selectedSize: z
            .object({
              size: z.string(),
              price: z.number(),
              quantity: z.number(),
            })
            .optional(),
          productType: z.union([
            z.literal("Product"),
            z.literal("digitalproducts"),
          ]),
          storeID: z.string(),
        })
      ),
    })
  ),
  customer: z.object({
    email: z.string().email(),
    phone_number: z.string(),
    name: z.string(),
  }),
  meta: z.object({
    address: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    userID: z.string(),
    deliveryType: z.union([
      z.literal(DeliveryType.Campus),
      z.literal(DeliveryType.OffCampus),
    ]),
  }),
});

export const flutterwaveRouter = createTRPCRouter({
  initializePayment: baseProcedure
    .input(flutterwaveInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      let session: mongoose.ClientSession | null = null;

      try {
        /**
         * Step 1: Validate User
         */

        if (
          !process.env.FLUTTERWAVE_API_URL ||
          !process.env.FLUTTERWAVE_SECRET_KEY ||
          !process.env.NEXT_PUBLIC_REDIRECT_URL
        ) {
          console.error("Missing required environment variables");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Server configuration error",
          });
        }

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        const Order = await getOrderModel();
        const cart = await getCartByUserId(user.id);

        /**
         * Step 2: Validate Cart
         */
        if (!cart) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User cart not found.",
          });
        }

        /**
         * Step 3: Validate that no existing order with same idempotencyKey exists
         * This prevents duplicate orders/payments if user retries
         */
        const idempotencyKey = cart.idempotencyKey;

        const existingOrder = await Order.findOne({
          idempotencyKey: idempotencyKey,
        });

        if (existingOrder) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Duplicate Order initiated.",
          });
        }

        // console.log("idempotencyKey:", idempotencyKey);

        const {
          amount,
          cartItemsWithShippingMethod: cartItems,
          customer,
          meta,
        } = input;
        const { email, phone_number, name } = customer;
        const { address, city, state, postal_code, userID, deliveryType } =
          meta;

        const payload = {
          tx_ref: `TX-REF-${generateUniqueId(8).toUpperCase()}`,
          amount: amount,
          currency: "NGN",
          redirect_url:
            process.env.NEXT_PUBLIC_REDIRECT_URL ||
            "https://www.soraxihub.com/checkout/payment-status",
          customer: {
            email: email,
            name: name,
            phonenumber: phone_number,
          },
          meta: {
            email: email,
            phone_number: phone_number,
            fullname: name,
          },
        } as const;

        // console.log("payload", payload);

        /**
         * Step 4: Create Order with status "Pending"
         * This order will be updated upon payment confirmation webhook
         */

        session = await mongoose.startSession();
        session.startTransaction();

        const storeIDs = [...new Set(cartItems.map((s) => s.storeID))];
        // console.log("storeIDs", storeIDs);
        // This is the subOrders array inside the main order
        const subOrders = cartItems.map((store) => {
          const products = store.products.map((item) => {
            const base = {
              Product: item.product._id,
              store: item.storeID,
              productSnapshot: {
                _id: item.product._id,
                name: item.product.name,
                images: item.product.images,
                quantity: Number(item.quantity),
                price: Number(item.selectedSize?.price || item.product.price),
              },
              storeSnapshot: {
                _id: store.storeID,
                name: store.storeName,
              },
            };

            if (item.selectedSize) {
              return {
                ...base,
                productSnapshot: {
                  ...base.productSnapshot,
                  selectedSize: {
                    size: item.selectedSize.size,
                    price: Number(item.selectedSize.price),
                  },
                },
              };
            }

            return base;
          });

          const storeTotal = products.reduce(
            (sum, item) =>
              sum + item.productSnapshot.price * item.productSnapshot.quantity,
            0
          );

          return {
            store: store.storeID,
            products,
            totalAmount: storeTotal,
            deliveryStatus: DeliveryStatus.OrderPlaced,
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
            statusHistory: [
              {
                status: StatusHistory.OrderPlaced,
                notes: "Initial Order request created.",
              },
            ], // we generate the status-history this way then letter, we use the push method to add items.
          };
        });

        // console.log("subOrders", subOrders);
        // Create and save main order
        const orderDoc = new Order({
          user: userID,
          stores: storeIDs,
          subOrders,
          totalAmount: amount,
          shippingAddress: {
            postalCode: postal_code,
            address: `${state}, ${city}, ${address}`,
            deliveryType: deliveryType,
          },
          // paymentMethod: channel, TODO: add payment method field to order model after flutterwave payment confirmation
          idempotencyKey: idempotencyKey,
          deliveryType: deliveryType,
          paymentStatus: PaymentStatus.Pending,
          paymentGateway: PaymentGateway.Flutterwave,
        });

        const savedOrder = (await orderDoc.save({
          session,
        })) as mongoose.Document & { _id: mongoose.Types.ObjectId };

        // commit transaction
        await session.commitTransaction();

        // console.log("savedOrder", savedOrder);
        const response = await fetch(
          `${process.env.FLUTTERWAVE_API_URL}/payments`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              // payment_options: "card, ussd",
              tx_ref: payload.tx_ref,
              amount: koboToNaira(payload.amount), // convert the amount from kobo to naira. for flutterwave, they need the amount in naira. Paystack is different.
              currency: payload.currency,
              redirect_url: payload.redirect_url,
              customer: payload.customer,
              meta: {
                ...payload.meta,
                orderId: savedOrder._id.toString(),
                idempotencyKey: idempotencyKey,
              },
              configurations: {
                session_duration: 10, // Session timeout in minutes (maxValue: 1440)
                max_retry_attempt: 3, // Max retry (int)
              },
            }),
          }
        );

        const result = (await response.json()) as {
          status: string;
          message: string;
          data: {
            link: string;
          };
        };

        if (!response.ok || !result.status) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.message || "Payment initialization failed",
          });
        }

        // console.log("Result", result);

        return result;
      } catch (error: any) {
        // Rollback transaction if it was started
        if (session) {
          await session.abortTransaction();
        }

        console.error("Flutterwave Payment Initialization Error:", error);

        // Re-throw TRPC errors as-is, wrap other errors
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while initializing payment.",
        });
      } finally {
        // Always end the session
        if (session) {
          await session.endSession();
        }
      }
    }),
});
