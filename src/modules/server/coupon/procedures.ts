import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { CouponService } from "@/services/coupon.service";
import { TRPCError } from "@trpc/server";

/**
 * tRPC Router: couponRouter
 * Handles all coupon operations including validation and application.
 */
export const couponRouter = createTRPCRouter({
  /**
   * Procedure: validateCoupon
   * Checks if a coupon is valid and returns its details.
   */
  validateCoupon: baseProcedure
    .input(
      z.object({
        code: z.string().min(2, "Coupon code is required"),
        orderTotal: z.number().positive(),
        storeId: z.array(z.string()).optional(),
        productIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { user } = ctx;
        const { code, storeId, orderTotal, productIds } = input;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
            cause: "UserNotAuthenticated",
          });
        }

        const couponService = await CouponService.init();
        const params = {
          userId: user.id,
          orderTotal,
          code,
          storeId,
          productIds,
        };

        const coupon = await couponService.validateCoupon(params);

        return {
          success: true,
          coupon,
        };
      } catch (err) {
        throw handleTRPCError(err, "Failed to validate coupon");
      }
    }),

  /**
   * Procedure: applyCoupon
   * Applies a valid coupon to an order or cart total.
   */
  applyCoupon: baseProcedure
    .input(
      z.object({
        code: z.string().min(2, "Coupon code is required"),
        orderTotal: z.number().positive(),
        storeIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;
        const { code, storeIds, orderTotal } = input;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
            cause: "UserNotAuthenticated",
          });
        }

        const couponService = await CouponService.init();
        const result = await couponService.applyCoupon({
          code,
          userId: user.id,
          storeIds,
          orderTotal,
        });

        return {
          success: true,
          discount: result.discount,
          //   totalAfterDiscount: result.totalAfterDiscount,
          message: "Coupon applied successfully",
        };
      } catch (err: any) {
        throw handleTRPCError(err, "Failed to apply coupon");
      }
    }),

  /**
   * Procedure: getCouponByCode
   * (Admin/Store only) Fetches full coupon details for dashboard use.
   */
  getCouponByCode: baseProcedure
    .input(
      z.object({
        code: z.string().min(2),
      })
    )
    .query(async ({ input }) => {
      try {
        const { code } = input;
        const couponService = await CouponService.init();
        const coupon = await couponService.getCouponByCode(code);

        if (!coupon) {
          return { success: false, reason: "COUPON_NOT_FOUND", coupon: null };
        }

        return {
          success: true,
          coupon,
        };
      } catch (err: any) {
        throw handleTRPCError(err, "Failed to fetch coupon");
      }
    }),
});
