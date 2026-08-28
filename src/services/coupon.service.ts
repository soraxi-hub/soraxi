import mongoose, { Model } from "mongoose";
import type { CouponRedemptionType } from "@/validators/coupon-redemption-validation";
import { getCouponModel, ICouponDocument } from "@/lib/db/models/coupon.model";
import {
  getCouponRedemptionModel,
  ICouponRedemptionDocument,
} from "@/lib/db/models/coupon-redemption.model";
import type { CouponType } from "@/validators/coupon-validations";
import type { Types } from "mongoose";
import { formatNaira } from "@/lib/utils/naira";
import { DiscountCalculator } from "@/lib/utils/discount-calculator";
import { DateFormatter } from "@/lib/utils/date-formatter";
import { AppError } from "@/lib/errors/app-error";

/**
 * Utility type: LeanDocumentWithId
 *
 * Extends a given data type `T` (typically a Zod-inferred schema type)
 * with the MongoDB `_id` field. This is especially useful when working
 * with `.lean()` queries in Mongoose, which return plain JavaScript objects
 * that still include an `_id` field but not Mongoose document methods.
 *
 * @template T - The base data type (e.g., inferred from a Zod schema)
 * @property {Types.ObjectId} _id - The unique identifier assigned by MongoDB
 *
 * @example
 * const coupon = await Coupon.findOne({ code }).lean<LeanDocumentWithId<CouponType>>();
 */
export type LeanDocumentWithId<T> = T & { _id: Types.ObjectId };

/**
 * CouponService
 *
 * Centralized business logic for coupon operations — including validation,
 * calculation, and redemption tracking. Designed for scalability, this service
 * ensures model initialization is fully asynchronous to support Next.js
 * environments that hot-reload Mongoose models.
 */
export class CouponService {
  private Coupon!: Model<ICouponDocument>;
  private Redemption!: Model<ICouponRedemptionDocument>;

  /**
   * Private constructor — forces the use of `CouponService.init()`
   * to ensure all async models are initialized before use.
   */
  private constructor() {}

  /**
   * 🧩 Initializes the CouponService with database models.
   *
   * This async factory method prevents model recompilation errors in Next.js
   * by lazily resolving Mongoose models through the getter functions.
   *
   * @example
   * const couponService = await CouponService.init();
   * await couponService.validateCoupon({ code: "WELCOME10", userId, orderTotal: 50000 });
   */
  static async init(): Promise<CouponService> {
    const service = new CouponService();
    service.Coupon = await getCouponModel();
    service.Redemption = await getCouponRedemptionModel();
    return service;
  }

  /**
   * Fetches active homepage-featured coupons.
   *
   * This powers the homepage hero/banner section.
   * Only returns coupons that are:
   * - Marked as homepage featured
   * - Active
   * - Within start and end date
   */
  async getHomepageCoupons(): Promise<LeanDocumentWithId<CouponType>[]> {
    const now = new Date();

    const coupons = await this.Coupon.find({
      isHomepageFeatured: true,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ createdAt: -1 }) // latest featured first
      .lean<LeanDocumentWithId<CouponType>[]>();

    return coupons;
  }

  /**
   * ✅ Validates whether a coupon can be applied by a given user
   * for a specific order/cart context.
   *
   * @throws {Error} If the coupon is invalid, expired, inactive, or out of scope.
   */
  async validateCoupon(params: {
    code: string;
    userId: string;
    orderTotal: number; // in kobo
    storeIds?: string[];
    productIds?: string[];
  }) {
    const { code, userId, storeIds = [], productIds = [], orderTotal } = params;

    const coupon = await this.Coupon.findOne({ code }).lean<
      LeanDocumentWithId<CouponType>
    >();
    if (!coupon)
      throw new AppError(
        "NOT_FOUND",
        "That coupon code doesn't exist. Check the spelling and try again.",
      );

    // 1️⃣ Date validity
    const now = new Date();
    if (now > coupon.endDate) {
      throw new AppError("BAD_REQUEST", "This coupon has expired.");
    }
    if (now < coupon.startDate) {
      throw new AppError(
        "BAD_REQUEST",
        `This coupon isn't active yet — it can be used from ${DateFormatter.shortDate(coupon.startDate)}.`,
      );
    }

    // 2️⃣ Active state
    if (!coupon.isActive) {
      throw new AppError("BAD_REQUEST", "This coupon is no longer active.");
    }

    // 3️⃣ Max redemption check
    if (coupon.maxRedemptions) {
      const totalUses = await this.Redemption.countDocuments({
        couponId: coupon.code,
      });
      if (totalUses >= coupon.maxRedemptions) {
        throw new AppError(
          "BAD_REQUEST",
          "This coupon has reached its usage limit and can no longer be redeemed.",
        );
      }
    }

    // 4️⃣ Per-user restriction
    if (coupon.userId && coupon.userId.toString() !== userId) {
      throw new AppError(
        "FORBIDDEN",
        "This coupon was issued to a different account.",
      );
    }

    // 5️⃣ Product/Store restriction
    if (
      coupon.productIds.length > 0 &&
      !coupon.productIds.some((id) => productIds.includes(id.toString()))
    ) {
      throw new AppError(
        "BAD_REQUEST",
        "This coupon doesn't apply to any of the items in your cart.",
      );
    }

    if (
      coupon.storeIds.length > 0 &&
      !coupon.storeIds.some((id) => storeIds.includes(id.toString()))
    ) {
      throw new AppError(
        "BAD_REQUEST",
        "This coupon only applies to items from certain vendors, and your cart has none of them.",
      );
    }

    // 6️⃣ Minimum order total. Both order Total and Min Order value are in kobo
    if (coupon.minOrderValue && orderTotal < coupon.minOrderValue) {
      throw new AppError(
        "BAD_REQUEST",
        `This coupon needs a minimum order of ${formatNaira(coupon.minOrderValue)}. Add ${formatNaira(coupon.minOrderValue - orderTotal)} more to use it.`,
      );
    }

    // validate coupon usage by user
    const isUsedByUser = await this.validateCouponUsageByUser(
      coupon.code,
      userId,
    );
    if (isUsedByUser) {
      throw new AppError(
        "CONFLICT",
        "You've already used this coupon. Each coupon can only be used once per account.",
      );
    }

    return coupon;
  }

  /**
   * 💰 Calculates discount amount based on coupon type.
   *
   * Ensures no over-discounting beyond the total order value.
   */
  calculateDiscount(coupon: CouponType, orderTotal: number) {
    const params = {
      type: coupon.type,
      value: coupon.value,
    };
    return DiscountCalculator.calculateDiscount(params, orderTotal);
  }

  /**
   * 🧾 Redeems a coupon — records the usage and ensures user hasn’t used it before.
   *
   * @throws {Error} If user has already redeemed this coupon.
   */
  async redeemCoupon(couponId: string, userId: string, orderId: string) {
    const existing = await this.Redemption.findOne({ couponId, userId });
    if (existing)
      throw new AppError(
        "CONFLICT",
        "You've already used this coupon. Each coupon can only be used once per account.",
      );

    await this.Redemption.create({
      couponId: couponId,
      userId: new mongoose.Types.ObjectId(userId),
      orderId: new mongoose.Types.ObjectId(orderId),
      redeemedAt: new Date(),
    });
  }

  /**
   * ♻️ Rollback redemption — used when an order is cancelled or fails.
   */
  async rollbackRedemption(orderId: string) {
    await this.Redemption.deleteOne({ orderId });
  }

  /**
   * Checks if the user has used this coupon code before.
   */
  async validateCouponUsageByUser(
    couponId: string,
    userId: string,
  ): Promise<boolean> {
    const couponRedemption = await this.Redemption.findOne({
      couponId,
      userId: new mongoose.Types.ObjectId(userId),
    }).lean<LeanDocumentWithId<CouponRedemptionType>>();

    return couponRedemption ? true : false;
  }

  /**
   * Public helper — fully applies a coupon:
   * validates, calculates, and redeems it atomically.
   *
   * @returns Object containing coupon code, discount, and type.
   */
  async applyCoupon(params: {
    code: string;
    userId: string;
    storeIds?: string[];
    productIds?: string[];
    orderTotal: number;
  }) {
    const coupon = await this.validateCoupon(params);
    const discount = this.calculateDiscount(coupon, params.orderTotal);

    return {
      code: coupon.code,
      discount,
      type: coupon.type,
      value: coupon.value,
    };
  }

  /**
   * Retrieves a single coupon by its MongoDB document ID.
   *
   * @async
   * @param {string} code - The coupon's MongoDB document ID.
   * @returns {Promise<LeanDocumentWithId<CouponType> | null>} The coupon data if found, otherwise `null`.
   * @throws {Error} If the provided ID is invalid.
   *
   */
  async getCouponByCode(
    code: string,
  ): Promise<LeanDocumentWithId<CouponType> | null> {
    if (!mongoose.Types.ObjectId.isValid(code)) {
      throw new AppError(
        "BAD_REQUEST",
        "That coupon reference isn't valid. Check the link you followed and try again.",
      );
    }

    const coupon = await this.Coupon.findById(
      code,
    ).lean<LeanDocumentWithId<CouponType> | null>();

    return coupon;
  }
}
