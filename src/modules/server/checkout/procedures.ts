import { TRPCError } from "@trpc/server";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { CheckoutQueryService } from "@/services/server-queries/checkout-query.service";

export const checkoutRouter = createTRPCRouter({
  /**
   * Retrieves the authenticated user's grouped cart.
   */
  getGroupedCart: baseProcedure.query(async ({ ctx }) => {
    try {
      const { user } = ctx;

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      return await CheckoutQueryService.getGroupedCart(user.id);
    } catch (error) {
      throw handleTRPCError(error);
    }
  }),

  /**
   * Validates a user's cart before checkout.
   * Ensures product stock and store eligibility.
   */
  validateUserCart: baseProcedure.mutation(async ({ ctx }) => {
    try {
      const { user } = ctx;

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      return await CheckoutQueryService.validateUserCart(user.id);
    } catch (error) {
      throw handleTRPCError(error);
    }
  }),
});
