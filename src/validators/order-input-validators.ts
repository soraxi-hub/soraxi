import { z } from "zod";
import { DeliveryType, ProductStatusEnum, ProductTypeEnum } from "@/enums";
import mongoose from "mongoose";

export const objectIdSchema = z
  .string()
  .refine(mongoose.Types.ObjectId.isValid, {
    message: "Invalid ObjectId",
  });

/**
 * ---------------------------------------------------
 * Size Schema
 * ---------------------------------------------------
 *
 * Adjust this to match your real Size type/interface.
 */
export const sizeSchema = z.object({
  size: z.string(),
  price: z.number(),
  quantity: z.number(),
});

/**
 * ---------------------------------------------------
 * Shipping Method Schema
 * ---------------------------------------------------
 */
export const shippingMethodSchema = z.object({
  name: z.string(),
  price: z.number(),
  estimatedDeliveryDays: z.number().optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
});

/**
 * ---------------------------------------------------
 * Base Cart Item Schema
 * ---------------------------------------------------
 *
 * Equivalent to ICartItem
 */
export const cartItemSchema = z.object({
  productId: z.string(),
  storeId: z.string(),
  quantity: z.number().min(1),
  productType: z.nativeEnum(ProductTypeEnum),
  selectedSize: sizeSchema.optional(),
});

/**
 * ---------------------------------------------------
 * Populated Product Schema
 * ---------------------------------------------------
 */
export const populatedProductSchema = z.object({
  productId: z.string(),
  storeId: z.string(),
  name: z.string(),
  image: z.string(),
  price: z.number(),
  sizes: z.array(sizeSchema),
  category: z.array(z.string()),
  slug: z.string(),
  status: z.nativeEnum(ProductStatusEnum),
  productType: z.nativeEnum(ProductTypeEnum),
  productQuantity: z.number(),
  inStock: z.boolean(),
});

/**
 * ---------------------------------------------------
 * IPopulatedCartItem Schema
 * ---------------------------------------------------
 */
export const populatedCartItemSchema = cartItemSchema.extend({
  product: populatedProductSchema,
});

/**
 * ---------------------------------------------------
 * Grouped Cart Store Item Schema
 * ---------------------------------------------------
 */
export const groupedCartStoreItemSchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  products: z.array(populatedCartItemSchema),
  shippingMethods: z.array(shippingMethodSchema),
});

/**
 * ---------------------------------------------------
 * Prepared Payment Schema
 * ---------------------------------------------------
 */
export const preparedPaymentSchema = z.object({
  amount: z.number(),
  cartItemsWithShippingMethod: z.array(
    groupedCartStoreItemSchema
      .omit({
        shippingMethods: true,
      })
      .extend({
        selectedShippingMethod: shippingMethodSchema,
      }),
  ),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone_number: z.string(),
  }),
  meta: z.object({
    city: z.string(),
    state: z.string(),
    address: z.string(),
    postal_code: z.string(),
    userId: z.string(),
    couponCode: z.string().nullable().optional(),
    deliveryType: z.nativeEnum(DeliveryType),
  }),
});

/**
 * ---------------------------------------------------
 * Inferred Type
 * ---------------------------------------------------
 */
export type PreparedPaymentData = z.infer<typeof preparedPaymentSchema>;
