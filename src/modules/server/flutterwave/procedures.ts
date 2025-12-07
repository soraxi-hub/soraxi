import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { FlutterwavePaymentService } from "@/domain/payments/flutterwave/flutterwave.service";
import { flutterwaveInputSchema } from "@/validators/order-input-validators";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { TRPCError } from "@trpc/server";

export const flutterwaveRouter = createTRPCRouter({
  initializePayment: baseProcedure
    .input(flutterwaveInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;
        /**
         * Step 1: Validate User
         */
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }
        const service = new FlutterwavePaymentService();
        return await service.initializePayment(input, user);
      } catch (error) {
        throw handleTRPCError(error);
      }
    }),
});
