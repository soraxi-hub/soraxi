import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";
import type mongoose from "mongoose";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

export const storeRouter = createTRPCRouter({
  getById: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const { id } = input;
        const Store = await getStoreModel();

        const store = (await Store.findById(id).select(
          "name storeEmail status verification businessInfo shippingMethods payoutAccounts agreedToTermsAt description security",
        )) as (IStore & { _id: string }) | null;

        if (!store) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Store with id ${id} not found.`,
            cause: "StoreNotFound",
          });
        }

        return {
          id: store._id.toString(),
          name: store.name,
          storeEmail: store.storeEmail,
          status: store.status,
          verification: store.verification,
          onboarding: computeOnboardingStatus(store),
          security: store.security,
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, { source: "trpc:store.getById" }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(error, "We couldn't load this store.");
      }
    }),

  getOnboardingDetails: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const { id } = input;

        if (!id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store is not authenticated",
          });
        }

        const Store = await getStoreModel();
        const store = (await Store.findById(id).lean()) as IStore | null;

        if (!store) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "We couldn't find your store. Sign out and sign in again.",
          });
        }

        // Determine progress
        const progressSteps = {
          profile: !!(store.name && store.description),
          shipping: !!(store.shippingMethods?.length > 0),
          payout: !!(store.payoutAccounts?.length > 0),
          terms: !!store.agreedToTermsAt,
        };

        const completedSteps = Object.entries(progressSteps)
          .filter(([_, complete]) => complete)
          .map(([key]) => key);

        const totalSteps = Object.keys(progressSteps).length;
        const currentStep = completedSteps.length;
        const percentage = Math.round(
          (completedSteps.length / totalSteps) * 100,
        );

        return {
          storeId: (store._id as unknown as mongoose.Types.ObjectId).toString(),
          data: {
            profile: {
              name: store.name,
              description: store.description,
            },
            shipping: store.shippingMethods,
            payout: store.payoutAccounts,
            terms: store.agreedToTermsAt,
          },
          progress: {
            currentStep,
            completedSteps,
            totalSteps,
            percentage,
          },
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:store.getOnboardingDetails",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't load your onboarding details.",
        );
      }
    }),
});

export const computeOnboardingStatus = (store: IStore) => {
  const onboardingStatus = {
    profileComplete: !!(store.name && store.description),
    shippingComplete: !!(
      store.shippingMethods && store.shippingMethods.length > 0
    ),
    // payoutComplete: !!(store.payoutAccounts && store.payoutAccounts.length > 0),
    termsComplete: !!store.agreedToTermsAt,
  };

  const completedSteps = Object.values(onboardingStatus).filter(Boolean).length;
  const totalSteps = Object.keys(onboardingStatus).length;

  return {
    ...onboardingStatus,
    completedSteps,
    totalSteps,
    isComplete: completedSteps === totalSteps,
    percentage: Math.round((completedSteps / totalSteps) * 100),
  };
};
