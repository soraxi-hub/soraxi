import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import { computeStoreOnboardingStats } from "@/domain/stores/onboarding-stats";

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
          onboarding: computeStoreOnboardingStats(store),
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
});
