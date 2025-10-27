import { CouponTypeEnum, ICoupon } from "@/validators/coupon-validations";
import { type Model, Schema, model, models } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { nairaToKobo } from "@/lib/utils/naira";

/**
 * 🎟️ Coupon Schema (Mongoose)
 *
 * Defines database structure and constraints for coupons.
 * Validations and defaults mirror the Zod schema for consistency.
 */
const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    type: {
      type: String,
      enum: Object.values(CouponTypeEnum),
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
      set: (value: number) => nairaToKobo(value),
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxRedemptions: {
      type: Number,
      default: null,
    },
    userId: {
      type: String,
      default: null,
    },
    productIds: {
      type: [String],
      default: [],
    },
    storeIds: {
      type: [String],
      default: [],
    },
    minOrderValue: {
      type: Number,
      default: null,
    },
    stackable: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/** Index coupon code for faster lookups */
couponSchema.index({ code: 1 });

/** Index expiration date to quickly disable expired coupons */
couponSchema.index({ endDate: 1 });

/**
 * Helper function to check coupon validity
 * (can be reused in services or tRPC procedures)
 */
couponSchema.methods.isCurrentlyValid = function (): boolean {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

/**
 * Getter function to prevent model recompilation errors in Next.js
 */
export const getCouponModel = async (): Promise<Model<ICoupon>> => {
  await connectToDatabase();

  return (
    (models.Coupon as Model<ICoupon>) || model<ICoupon>("Coupon", couponSchema)
  );
};
