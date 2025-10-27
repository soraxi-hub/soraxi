import { z } from "zod";
import type { Document } from "mongoose";

export enum CouponTypeEnum {
  Percentage = "percentage",
  Fixed = "fixed",
}

/**
 * Zod schema for Coupon
 *
 * Represents a promotional coupon that can apply to
 * all orders, specific users, or selected stores/products.
 *
 * All monetary values (if any) should be stored in kobo
 * to avoid floating-point errors.
 */
export const CouponSchema = z.object({
  /** Unique code customers will enter to redeem */
  code: z.string().min(3).max(20),

  /** Whether the coupon provides a percentage or fixed amount discount */
  type: z.nativeEnum(CouponTypeEnum),

  /** Discount value (e.g., 10 for 10% or 5000 for ₦50.00 if in kobo) */
  value: z.number().positive(),

  /** Start and end dates controlling coupon validity */
  startDate: z.date(),
  endDate: z.date(),

  /** Whether this coupon is currently active or disabled by admin */
  isActive: z.boolean().default(true),

  /**
   * Maximum number of total redemptions allowed.
   * `null` means unlimited usage.
   */
  maxRedemptions: z.number().nullable().default(null),

  /**
   * Restricts coupon to a single user (for personalized coupons).
   * Null means available to all users.
   */
  userId: z.string().nullable().default(null),

  /**
   * Optional list of product IDs this coupon applies to.
   * If empty, coupon applies globally (to entire cart or store).
   */
  productIds: z.array(z.string()).default([]),

  /**
   * Optional list of store IDs this coupon applies to.
   */
  storeIds: z.array(z.string()).default([]),

  /** Minimum order total (in kobo) required before coupon can apply */
  minOrderValue: z.number().nullable().default(null),

  /** Whether coupon is stackable with other promotions */
  stackable: z.boolean().default(false),

  /** Auto-generated timestamps (set in Mongoose) */
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const CouponSchemaWithId = CouponSchema.extend({
  _id: z.string(),
});

export const CouponFormSchema = CouponSchema.omit({
  userId: true,
  storeIds: true,
  productIds: true,
  createdAt: true,
  updatedAt: true,
})
  .partial()
  .extend({
    _id: z.string().optional(),
    code: z.string(),
    value: z.number().positive(),
    startDate: z.date(),
    endDate: z.date(),
    type: z.nativeEnum(CouponTypeEnum),
  });

export type CouponFormSchemaType = z.infer<typeof CouponFormSchema>;
export type CouponSchemaWithIdType = z.infer<typeof CouponSchemaWithId>;

/** TypeScript type inferred from Zod */
export type CouponType = z.infer<typeof CouponSchema>;

/**
 * Mongoose document interface for Coupon
 * Extends the Zod type with Mongoose Document methods
 */
export interface ICoupon extends CouponType, Document {}
