import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getCouponModel } from "@/lib/db/models/coupon.model";
import { getCouponRedemptionModel } from "@/lib/db/models/coupon-redemption.model";
import { CouponTypeEnum } from "@/validators/coupon-validations";
import mongoose from "mongoose";

export const adminCouponRouter = createTRPCRouter({
  /**
   * List all coupons with pagination and filtering
   */
  listCoupons: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(["active", "inactive", "expired", "all"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { page, limit, search, status } = input;
        const Coupon = await getCouponModel();

        const query: any = {};

        if (search) {
          query.code = { $regex: search, $options: "i" };
        }

        if (status && status !== "all") {
          const now = new Date();
          if (status === "active") {
            query.isActive = true;
            query.startDate = { $lte: now };
            query.endDate = { $gte: now };
          } else if (status === "inactive") {
            query.isActive = false;
          } else if (status === "expired") {
            query.endDate = { $lt: now };
          }
        }

        const coupons = await Coupon.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

        const total = await Coupon.countDocuments(query);

        return {
          success: true,
          coupons: coupons.map((coupon: any) => ({
            _id: coupon._id.toString(),
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            isActive: coupon.isActive,
            startDate: coupon.startDate,
            endDate: coupon.endDate,
            maxRedemptions: coupon.maxRedemptions,
            createdAt: coupon.createdAt,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch coupons",
        });
      }
    }),

  /**
   * Get single coupon by ID
   */
  getCouponById: baseProcedure
    .input(z.object({ couponId: z.string() }))
    .query(async ({ input }) => {
      try {
        const { couponId } = input;

        if (!mongoose.Types.ObjectId.isValid(couponId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid coupon ID",
          });
        }

        const Coupon = await getCouponModel();
        const coupon = await Coupon.findById(couponId).lean();

        if (!coupon) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coupon not found",
          });
        }

        return {
          success: true,
          coupon: {
            _id: coupon._id.toString(),
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            isActive: coupon.isActive,
            startDate: coupon.startDate,
            endDate: coupon.endDate,
            maxRedemptions: coupon.maxRedemptions,
            userId: coupon.userId,
            productIds: coupon.productIds,
            storeIds: coupon.storeIds,
            minOrderValue: coupon.minOrderValue,
            stackable: coupon.stackable,
            createdAt: coupon.createdAt,
            updatedAt: coupon.updatedAt,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch coupon",
        });
      }
    }),

  /**
   * Create new coupon
   */
  createCoupon: baseProcedure
    .input(
      z.object({
        code: z.string().min(3).max(20),
        type: z.nativeEnum(CouponTypeEnum),
        value: z.number().positive(),
        startDate: z.date(),
        endDate: z.date(),
        isActive: z.boolean().default(true),
        maxRedemptions: z.number().nullable().optional(),
        userId: z.string().nullable().optional(),
        productIds: z.array(z.string()).optional(),
        storeIds: z.array(z.string()).optional(),
        minOrderValue: z.number().nullable().optional(),
        stackable: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const Coupon = await getCouponModel();

        const existingCoupon = await Coupon.findOne({ code: input.code });
        if (existingCoupon) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Coupon code already exists",
          });
        }

        if (input.endDate <= input.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "End date must be after start date",
          });
        }

        await Coupon.create(input);

        return {
          success: true,
          message: "Coupon created successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create coupon",
        });
      }
    }),

  /**
   * Update existing coupon
   */
  updateCoupon: baseProcedure
    .input(
      z.object({
        couponId: z.string(),
        code: z.string().min(3).max(20).optional(),
        type: z.nativeEnum(CouponTypeEnum).optional(),
        value: z.number().positive().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        isActive: z.boolean().optional(),
        maxRedemptions: z.number().nullable().optional(),
        userId: z.string().nullable().optional(),
        productIds: z.array(z.string()).optional(),
        storeIds: z.array(z.string()).optional(),
        minOrderValue: z.number().nullable().optional(),
        stackable: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { couponId, ...updateData } = input;

        if (!mongoose.Types.ObjectId.isValid(couponId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid coupon ID",
          });
        }

        const Coupon = await getCouponModel();
        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coupon not found",
          });
        }

        if (updateData.code && updateData.code !== coupon.code) {
          const existing = await Coupon.findOne({ code: updateData.code });
          if (existing) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Coupon code already exists",
            });
          }
        }

        if (updateData.startDate && updateData.endDate) {
          if (updateData.endDate <= updateData.startDate) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "End date must be after start date",
            });
          }
        }

        const updated = await Coupon.findByIdAndUpdate(couponId, updateData, {
          new: true,
        }).lean();

        return {
          success: true,
          message: "Coupon updated successfully",
          coupon: updated,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update coupon",
        });
      }
    }),

  /**
   * Delete coupon
   */
  deleteCoupon: baseProcedure
    .input(z.object({ couponId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const { couponId } = input;

        if (!mongoose.Types.ObjectId.isValid(couponId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid coupon ID",
          });
        }

        const Coupon = await getCouponModel();
        const coupon = await Coupon.findByIdAndDelete(couponId);

        if (!coupon) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coupon not found",
          });
        }

        return {
          success: true,
          message: "Coupon deleted successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete coupon",
        });
      }
    }),

  /**
   * Get coupon usage details
   */
  getCouponUsage: baseProcedure
    .input(
      z.object({
        couponId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const { couponId, page, limit } = input;

        if (!mongoose.Types.ObjectId.isValid(couponId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid coupon ID",
          });
        }

        const Coupon = await getCouponModel();
        const Redemption = await getCouponRedemptionModel();

        const coupon = await Coupon.findById(couponId).lean();
        if (!coupon) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Coupon not found",
          });
        }

        const redemptions = await Redemption.find({ couponId })
          .sort({ redeemedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

        const total = await Redemption.countDocuments({ couponId });

        return {
          success: true,
          coupon: {
            code: coupon.code,
            maxRedemptions: coupon.maxRedemptions,
            totalRedemptions: total,
          },
          redemptions: redemptions.map((r: any) => ({
            _id: r._id.toString(),
            userId: r.userId,
            orderId: r.orderId,
            redeemedAt: r.redeemedAt,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch coupon usage",
        });
      }
    }),
});
