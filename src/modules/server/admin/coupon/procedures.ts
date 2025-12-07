import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { CouponTypeEnum } from "@/validators/coupon-validations";
import { CouponQueryService } from "@/services/server-queries/coupon-query.service";
import { koboToNaira } from "@/lib/utils/naira";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import { TRPCError } from "@trpc/server";
import { PERMISSIONS } from "@/modules/admin/security/permissions";

export const adminCouponRouter = createTRPCRouter({
  /**
   * List all coupons (admin)
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
    .query(async ({ input, ctx }) => {
      try {
        const { admin } = ctx;

        if (
          !admin ||
          !checkAdminPermission(admin, [PERMISSIONS.VIEW_COUPONS])
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view coupons",
          });
        }

        const pagination = CouponQueryService.validatePagination(
          input.page,
          input.limit
        );

        const result = await CouponQueryService.listCoupons(
          {
            search: input.search,
            status: input.status,
          },
          pagination
        );

        return {
          success: true,
          coupons: result.coupons.map((coupon) => ({
            _id: coupon._id.toString(),
            code: coupon.code,
            type: coupon.type,
            value:
              coupon.type === CouponTypeEnum.Fixed
                ? koboToNaira(coupon.value)
                : coupon.value,
            isActive: coupon.isActive,
            startDate: coupon.startDate,
            endDate: coupon.endDate,
            maxRedemptions: coupon.maxRedemptions,
            minOrderValue: koboToNaira(coupon.minOrderValue ?? 0),
            createdAt: coupon.createdAt,
            isHomepageFeatured: coupon.isHomepageFeatured,
          })),
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            pages: result.totalPages,
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch coupons");
      }
    }),

  /**
   * ✅ Get coupon by ID
   */
  getCouponById: baseProcedure
    .input(z.object({ couponId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const { admin } = ctx;

        if (
          !admin ||
          !checkAdminPermission(admin, [PERMISSIONS.VIEW_COUPONS])
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view coupons",
          });
        }

        const coupon = await CouponQueryService.getById(input.couponId);

        return {
          success: true,
          coupon: {
            ...coupon,
            _id: coupon._id.toString(),
            value: koboToNaira(coupon.value),
            minOrderValue: koboToNaira(coupon.minOrderValue ?? 0),
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch coupon");
      }
    }),

  /**
   * ✅ Create coupon
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
        isHomepageFeatured: z.boolean().default(false),
        maxRedemptions: z.number().nullable().optional(),
        userId: z.string().nullable().optional(),
        productIds: z.array(z.string()).optional(),
        storeIds: z.array(z.string()).optional(),
        minOrderValue: z.number().nullable().optional(),
        stackable: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { admin } = ctx;

        if (
          !admin ||
          !checkAdminPermission(admin, [PERMISSIONS.CREATE_COUPONS])
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create coupons",
          });
        }

        await CouponQueryService.createCoupon(input as any);

        return {
          success: true,
          message: "Coupon created successfully",
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to create coupon");
      }
    }),

  /**
   * ✅ Update coupon
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
        isHomepageFeatured: z.boolean().optional(),
        maxRedemptions: z.number().nullable().optional(),
        minOrderValue: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { couponId, ...updateData } = input;
        const { admin } = ctx;

        if (
          !admin ||
          !checkAdminPermission(admin, [PERMISSIONS.EDIT_COUPONS])
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to edit or update coupons",
          });
        }

        await CouponQueryService.updateCoupon(couponId, updateData as any);

        return {
          success: true,
          message: "Coupon updated successfully",
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to update coupon");
      }
    }),

  /**
   * ✅ Delete coupon
   */
  deleteCoupon: baseProcedure
    .input(z.object({ couponId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { admin } = ctx;

        if (
          !admin ||
          !checkAdminPermission(admin, [PERMISSIONS.DELETE_COUPONS])
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete coupons",
          });
        }

        await CouponQueryService.deleteCoupon(input.couponId);

        return {
          success: true,
          message: "Coupon deleted successfully",
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to delete coupon");
      }
    }),

  /**
   * ✅ Get coupon usage
   */
  getCouponUsage: baseProcedure
    .input(
      z.object({
        couponId: z.string(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { admin } = ctx;

        if (
          !admin ||
          !checkAdminPermission(admin, [PERMISSIONS.VIEW_COUPON_REDEMPTIONS])
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view coupon redemptions",
          });
        }

        const pagination = CouponQueryService.validatePagination(
          input.page,
          input.limit
        );

        const result = await CouponQueryService.getCouponUsage(
          input.couponId,
          pagination
        );

        return {
          success: true,
          coupon: {
            code: result.coupons[0].code,
            type: result.coupons[0].type,
            maxRedemptions: result.coupons[0].maxRedemptions,
            totalRedemptions: result.total,
          },
          redemptions: result.redemptions,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            pages: result.totalPages,
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch coupon usage");
      }
    }),
});
