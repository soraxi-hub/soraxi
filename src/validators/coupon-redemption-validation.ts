import { z } from "zod";
import type { Document } from "mongoose";

/**
 * Zod schema for Coupon Redemption
 *
 * Tracks each time a coupon is used by a user on an order.
 * Useful for analytics and enforcing usage limits.
 */
export const CouponRedemptionSchema = z.object({
  /** The coupon code used */
  couponId: z.string(),

  /** The user who redeemed it */
  userId: z.string(),

  /** The order associated with this redemption */
  orderId: z.string(),

  /** Date of redemption */
  redeemedAt: z.date().default(() => new Date()),
});

export type CouponRedemptionType = z.infer<typeof CouponRedemptionSchema>;

/** Mongoose document interface for coupon redemptions */
export interface ICouponRedemption extends CouponRedemptionType, Document {}
