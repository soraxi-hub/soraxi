import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { CouponService } from "@/services/coupon.service";
import { TRPCError } from "@trpc/server";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

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
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const { user } = ctx;
        const { code, storeId, orderTotal, productIds } = input;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in to use a coupon on your order.",
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
        if (isReportableError(err)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(err, { source: "trpc:coupon.validateCoupon" }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(
          err,
          "We couldn't validate coupon. Please try again.",
        );
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
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;
        const { code, storeIds, orderTotal } = input;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in to use a coupon on your order.",
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
          code: result.code,
          type: result.type,
          value: result.value,
          message: "Coupon applied successfully",
        };
      } catch (err: any) {
        if (isReportableError(err)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(err, { source: "trpc:coupon.applyCoupon" }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(
          err,
          "We couldn't apply that coupon. Please try again.",
        );
      }
    }),

  /**
   * Procedure: getHomepageCoupons
   * Fetches active homepage-featured coupons for public display.
   */
  getHomepageCoupons: baseProcedure.query(async () => {
    try {
      const couponService = await CouponService.init();
      const coupons = await couponService.getHomepageCoupons();

      return {
        success: true,
        coupons,
      };
    } catch (err) {
      if (isReportableError(err)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(err, {
              source: "trpc:coupon.getHomepageCoupons",
            }),
          );
        } catch {
          // sendTelegramMessage already console.errors internally; never mask the original error
        }
      }
      throw handleTRPCError(
        err,
        "We couldn't load homepage coupons. Please try again.",
      );
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
      }),
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
        if (isReportableError(err)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(err, { source: "trpc:coupon.getCouponByCode" }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(
          err,
          "We couldn't load that coupon. Please try again.",
        );
      }
    }),
});
