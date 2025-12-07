import { z } from "zod";
import { CouponTypeEnum } from "@/validators/coupon-validations";
import { Document } from "mongoose";

export const DiscountSchema = z.object({
  amount: z.number().min(0, "Discount amount must be non-negative"), // The discount amount applied
  couponCode: z.string().optional(), // Reference to the coupon if applicable
  type: z.nativeEnum(CouponTypeEnum).optional(), // Type of discount for tracking
  description: z.string().optional(), // Human-readable description
});

export const DiscountSchemaOptional = DiscountSchema.optional();

// For TypeScript inference
export type DiscountType = z.infer<typeof DiscountSchema>;
export type DiscountTypeOptional = z.infer<typeof DiscountSchemaOptional>;

/**
 * Mongoose document interface for Discount
 * Extends the Zod type with Mongoose Document methods
 *
 * - Interface representing discount breakdown in an order or sub-order.
 */
export interface IDiscount extends DiscountType, Document {}
