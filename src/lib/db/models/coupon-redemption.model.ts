import { ICouponRedemption } from "@/validators/coupon-redemption-validation";
import { Document, type Model, Schema, model, models } from "mongoose";
import { connectToDatabase } from "../mongoose";

export type ICouponRedemptionDocument = ICouponRedemption & Document;

/**
 * Coupon Redemption Schema (Mongoose)
 *
 * Tracks each time a coupon is redeemed.
 * Useful for analytics, fraud prevention, and enforcing max usage limits.
 */
const couponRedemptionSchema = new Schema<ICouponRedemptionDocument>(
  {
    couponId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "UserId is required for reference"],
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      required: [true, "orderId is required for reference"],
      index: true,
      ref: "Order",
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
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
  Model<ICouponRedemptionDocument>
> => {
  await connectToDatabase();

  return (
    (models.CouponRedemption as Model<ICouponRedemptionDocument>) ||
    model<ICouponRedemptionDocument>("CouponRedemption", couponRedemptionSchema)
  );
};
