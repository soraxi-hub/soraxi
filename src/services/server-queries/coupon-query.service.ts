import mongoose, { FilterQuery } from "mongoose";
import { TRPCError } from "@trpc/server";

import { getCouponModel } from "@/lib/db/models/coupon.model";
import { getCouponRedemptionModel } from "@/lib/db/models/coupon-redemption.model";
import { ICoupon } from "@/validators/coupon-validations";
import { LeanDocumentWithId } from "../coupon.service";
import { DiscountType } from "@/validators/discount-validation";
import { getUserModel } from "@/lib/db/models/user.model";
import { getOrderModel } from "@/lib/db/models/order.model";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface CouponFilters {
  search?: string;
  status?: "active" | "inactive" | "expired" | "all";
}

export interface CouponQueryResult {
  coupons: LeanDocumentWithId<ICoupon>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PopulatedCouponRedemption {
  _id: string;
  couponId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  orderId: {
    _id: string;
    totalAmount: number;
    discount: DiscountType;
  };
  redeemedAt: Date;
}

/**
 * CouponQueryService
 * Centralized DB logic for admin coupon operations
 */
export class CouponQueryService {
  /**
   * Validate & normalize pagination
   */
  static validatePagination(page?: number, limit?: number): PaginationParams {
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    return { page: normalizedPage, limit: normalizedLimit };
  }

  /**
   * Build MongoDB filter for admin coupon listing
   */
  static buildCouponFilter(filters: CouponFilters): FilterQuery<ICoupon> {
    const query: FilterQuery<ICoupon> = {};
    const now = new Date();

    if (filters.search) {
      query.code = { $regex: filters.search, $options: "i" };
    }

    if (filters.status && filters.status !== "all") {
      if (filters.status === "active") {
        query.isActive = true;
        query.startDate = { $lte: now };
        query.endDate = { $gte: now };
      }

      if (filters.status === "inactive") {
        query.isActive = false;
      }

      if (filters.status === "expired") {
        query.endDate = { $lt: now };
      }
    }

    return query;
  }

  /**
   * List coupons (paginated)
   */
  static async listCoupons(
    filters: CouponFilters,
    pagination: PaginationParams
  ): Promise<CouponQueryResult> {
    const Coupon = await getCouponModel();

    const query = this.buildCouponFilter(filters);
    const skip = (pagination.page - 1) * pagination.limit;

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pagination.limit)
        .lean<LeanDocumentWithId<ICoupon>[]>(),

      Coupon.countDocuments(query),
    ]);

    return {
      coupons,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Get coupon by ID
   */
  static async getById(couponId: string): Promise<LeanDocumentWithId<ICoupon>> {
    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid coupon ID",
      });
    }

    const Coupon = await getCouponModel();
    const coupon =
      await Coupon.findById(couponId).lean<LeanDocumentWithId<ICoupon>>();

    if (!coupon) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Coupon not found",
      });
    }

    return coupon;
  }

  /**
   * Create new coupon
   */
  static async createCoupon(input: Partial<ICoupon>) {
    const Coupon = await getCouponModel();

    const exists = await Coupon.findOne({ code: input.code });
    if (exists) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Coupon code already exists",
      });
    }

    if (input.startDate && input.endDate && input.endDate <= input.startDate) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "End date must be after start date",
      });
    }

    return Coupon.create(input);
  }

  /**
   * Update coupon safely using document save
   */
  static async updateCoupon(couponId: string, updateData: Partial<ICoupon>) {
    const Coupon = await getCouponModel();

    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid coupon ID",
      });
    }

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Coupon not found",
      });
    }

    if (updateData.code && updateData.code !== coupon.code) {
      const exists = await Coupon.findOne({ code: updateData.code });
      if (exists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Coupon code already exists",
        });
      }
    }

    const finalStart = updateData.startDate ?? coupon.startDate;
    const finalEnd = updateData.endDate ?? coupon.endDate;

    if (finalEnd <= finalStart) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "End date must be after start date",
      });
    }

    Object.assign(coupon, updateData);
    return coupon.save();
  }

  /**
   * Delete coupon
   */
  static async deleteCoupon(couponId: string) {
    const Coupon = await getCouponModel();

    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid coupon ID",
      });
    }

    const deleted = await Coupon.findByIdAndDelete(couponId);

    if (!deleted) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Coupon not found",
      });
    }

    return deleted;
  }

  /**
   * Get coupon redemptions (paginated)
   */
  static async getCouponUsage(couponId: string, pagination: PaginationParams) {
    const Coupon = await getCouponModel();
    const Redemption = await getCouponRedemptionModel();
    await getUserModel();
    await getOrderModel();

    const coupon = await Coupon.find({
      code: couponId.toUpperCase(),
    }).lean<ICoupon[]>();

    if (!coupon) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Coupon not found",
      });
    }

    const skip = (pagination.page - 1) * pagination.limit;

    const [redemptions, total] = await Promise.all([
      Redemption.find({ couponId: couponId.toUpperCase() })
        .populate({
          path: "userId",
          model: "User",
          select: "_id firstName lastName",
        })
        .populate({
          path: "orderId",
          model: "Order",
          select: "_id totalAmount discount",
        })
        .sort({ redeemedAt: -1 })
        .skip(skip)
        .limit(pagination.limit)
        .lean<PopulatedCouponRedemption[]>(),

      Redemption.countDocuments({ couponId: couponId.toUpperCase() }),
    ]);

    const nomalizedRedemptions = redemptions.map((r) => {
      return {
        ...r,
        _id: r._id.toString(),
        userId: {
          ...r.userId,
          _id: r.userId._id.toString(),
        },
        orderId: {
          ...r.orderId,
          _id: r.orderId._id.toString(),
        },
      };
    });

    return {
      coupon,
      redemptions: nomalizedRedemptions,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }
}
