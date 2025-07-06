import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";

export const storeRouter = createTRPCRouter({
  getById: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async (input) => {
      const { id } = input.input;
      const Store = await getStoreModel();

      const store = (await Store.findById(id).select(
        "name storeEmail status verification businessInfo shippingMethods payoutAccounts agreedToTermsAt description logoUrl bannerUrl"
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
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        onboarding: computeOnboardingStatus(store),
      };
    }),
});

export const computeOnboardingStatus = (store: IStore) => {
  const onboardingStatus = {
    profileComplete: !!(store.name && store.description),
    businessInfoComplete: !!(
      store.businessInfo &&
      (store.businessInfo.type === "individual" ||
        (store.businessInfo.type === "company" &&
          store.businessInfo.businessName &&
          store.businessInfo.registrationNumber))
    ),
    shippingComplete: !!(
      store.shippingMethods && store.shippingMethods.length > 0
    ),
    payoutComplete: !!(store.payoutAccounts && store.payoutAccounts.length > 0),
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
