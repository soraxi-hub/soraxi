import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { FlutterwavePaymentService } from "@/domain/payments/flutterwave/flutterwave.service";
import { flutterwaveInputSchema } from "@/validators/order-input-validators";

export const flutterwaveRouter = createTRPCRouter({
  initializePayment: baseProcedure
    .input(flutterwaveInputSchema)
    .mutation(async ({ input, ctx }) => {
      const service = new FlutterwavePaymentService();
      return await service.initializePayment(input, ctx.user);
    }),
});
