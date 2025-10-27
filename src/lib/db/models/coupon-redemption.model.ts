import { ICouponRedemption } from "@/validators/coupon-redemption-validation";
import { type Model, Schema, model, models } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * 🧾 Coupon Redemption Schema (Mongoose)
 *
 * Tracks each time a coupon is redeemed.
 * Useful for analytics, fraud prevention, and enforcing max usage limits.
 */
const couponRedemptionSchema = new Schema<ICouponRedemption>(
  {
    couponId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

/**
 * Compound index to prevent multiple redemptions
 * of the same coupon by the same user.
 */
couponRedemptionSchema.index({ couponId: 1, userId: 1 }, { unique: true });

/**
 * Getter function to safely return the model instance.
 * Avoids "Cannot overwrite model once compiled" errors.
 */
export const getCouponRedemptionModel = async (): Promise<
  Model<ICouponRedemption>
> => {
  await connectToDatabase();

  return (
    (models.CouponRedemption as Model<ICouponRedemption>) ||
    model<ICouponRedemption>("CouponRedemption", couponRedemptionSchema)
  );
};
