import { z } from "zod";
import { ProductTypeEnum } from "./product-validators";
import { DeliveryType } from "@/enums";

// Define the Zod schema for validation
export const flutterwaveInputSchema = z.object({
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
      storeId: z.string(),
      storeName: z.string(),
      products: z.array(
        z.object({
          product: z.object({
            _id: z.string(),
            storeId: z.string(),
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
          productType: z.nativeEnum(ProductTypeEnum),
          storeId: z.string(),
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
    userId: z.string(),
    deliveryType: z.nativeEnum(DeliveryType),
  }),
});

export type FlutterwaveInput = z.infer<typeof flutterwaveInputSchema>;
