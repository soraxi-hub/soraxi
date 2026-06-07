import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { preparedPaymentSchema } from "@/validators/order-input-validators";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { TRPCError } from "@trpc/server";
import { PaymentGateway } from "@/enums";
import { PaymentService } from "@/services/payment/payment.service";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { getUserModel, IUser } from "@/lib/db/models/user.model";
import mongoose from "mongoose";
import { UserFactory } from "@/domain/users/user-factory";

export const flutterwaveRouter = createTRPCRouter({
  initializePayment: baseProcedure
    .input(preparedPaymentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;
        const userModel = await getUserModel();
        /**
         * Step 1: Validate User
         */
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        const userDataDoc = await QueryBuilderFactory.queryBuilder<IUser>(
          userModel,
        )
          .where("_id", new mongoose.Types.ObjectId(user.id))
          .executeOne();

        if (!userDataDoc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const userData = UserFactory.createBaseUser(userDataDoc).toJSON();
        if (input.meta.userId !== userData.userId)
          throw new Error("UNAUTHORIZED: UserId mismatch");

        const props = {
          input,
          user: userData,
        };
        return await PaymentService.initializePayment({
          gateway: PaymentGateway.Flutterwave,
          props,
        });
      } catch (error) {
        throw handleTRPCError(error);
      }
    }),
});
