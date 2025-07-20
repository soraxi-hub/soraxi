import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

// type PaystackInitResponse = {
//   status: boolean;
//   message: string;
//   data: {
//     authorization_url: string;
//     access_code: string;
//     reference: string;
//   };
// };

// Define the Zod schema for validation
const paystackInputSchema = z.object({
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
        .optional(), // optional because a store may not have any shipping methods yet. fixe it before you go live
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
      shippingMethods: z.array(
        z.object({
          name: z.string(),
          price: z.number(),
          description: z.string().optional(),
          estimatedDeliveryDays: z.number().optional(),
        })
      ),
    })
  ),
  customer: z.object({
    email: z.string().email(),
    phone_number: z.string(),
    name: z.string(),
    uniqueRef: z.string(),
  }),
  meta: z.object({
    address: z.string(),
    secondary_phone_number: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    userID: z.string(),
  }),
});

export const paystackRouter = createTRPCRouter({
  initializePayment: baseProcedure
    .input(paystackInputSchema)
    .mutation(async ({ input }) => {
      try {
        const { amount, cartItemsWithShippingMethod, customer, meta } = input;
        const { email, phone_number, name, uniqueRef } = customer;
        const {
          address,
          secondary_phone_number,
          city,
          state,
          postal_code,
          userID,
        } = meta;

        const url = "https://api.paystack.co/transaction/initialize";

        const fields = {
          email,
          amount,
          reference: uniqueRef,
          customer: {
            first_name: name,
            phone: phone_number,
          },
          metadata: {
            userID,
            name,
            city,
            state,
            address,
            postal_code,
            phone_number,
            itemsInCart: cartItemsWithShippingMethod,
            secondary_phone_number,
          },
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
          body: JSON.stringify(fields),
        });

        const result = (await response.json()) as {
          status: boolean;
          message: string;
          data: {
            authorization_url: string;
            access_code: string;
            reference: string;
          };
        };

        if (!response.ok || !result.status) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.message || "Payment initialization failed",
          });
        }

        return result;
      } catch (error: any) {
        console.error("Paystack Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while initializing payment.",
        });
      }
    }),
});
