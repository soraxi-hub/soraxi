import { z } from "zod";
import type { Document } from "mongoose";
import { Types } from "mongoose";

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
export interface ICouponRedemption extends Document {
  /** Reference to the redeemed coupon (MongoDB ObjectId) */
  couponId: string;

  /** Reference to the user who redeemed the coupon (MongoDB ObjectId) */
  userId: Types.ObjectId;

  /** Reference to the order associated with this redemption (MongoDB ObjectId) */
  orderId: Types.ObjectId;

  /** Timestamp indicating when the coupon was redeemed */
  redeemedAt: Date;
}
