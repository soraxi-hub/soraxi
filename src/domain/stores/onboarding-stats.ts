import { IShippingMethod } from "@/lib/db/models/store.model";

/**
 * The minimal shape needed to compute onboarding progress.
 */
export interface StoreOnboardingInput {
  name?: string;
  description?: string;
  shippingMethods?: IShippingMethod[];
  agreedToTermsAt?: Date;
}

export type StoreOnboardingStep = "profile" | "shipping" | "terms";

export interface StoreOnboardingStats {
  profileComplete: boolean;
  shippingComplete: boolean;
  termsComplete: boolean;
  /** Step ids in the order they were completed, not the order onboarding presents them. */
  completedStepIds: StoreOnboardingStep[];
  /** How many of the three steps are done. */
  completedSteps: number;
  totalSteps: number;
  isComplete: boolean;
  percentage: number;
}

/**
 * A store's onboarding is three steps: a profile (name + description),
 * at least one shipping method, and agreeing to terms.
 *
 * This is the single source of truth for what "complete" means for each of
 * those, and for how they roll up into a percentage.
 */
export function computeStoreOnboardingStats(
  store: StoreOnboardingInput,
): StoreOnboardingStats {
  const profileComplete = !!(store.name && store.description);
  const shippingComplete = !!(
    store.shippingMethods && store.shippingMethods.length > 0
  );
  const termsComplete = !!store.agreedToTermsAt;

  const flags: Record<StoreOnboardingStep, boolean> = {
    profile: profileComplete,
    shipping: shippingComplete,
    terms: termsComplete,
  };

  const completedStepIds = (Object.keys(flags) as StoreOnboardingStep[]).filter(
    (step) => flags[step],
  );
  const totalSteps = Object.keys(flags).length;
  const completedSteps = completedStepIds.length;

  return {
    profileComplete,
    shippingComplete,
    termsComplete,
    completedStepIds,
    completedSteps,
    totalSteps,
    isComplete: completedSteps === totalSteps,
    percentage: Math.round((completedSteps / totalSteps) * 100),
  };
}
