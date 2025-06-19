"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { PayoutForm } from "@/components/forms/PayoutForm";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";

/**
 * Payout Setup Onboarding Page
 * Fourth step in the onboarding process - configures bank account for payments
 */
export default function PayoutPage() {
  const router = useRouter();
  const { setCurrentStep } = useStoreOnboarding();

  useEffect(() => {
    // Set current step when component mounts
    setCurrentStep(3);
  }, [setCurrentStep]);

  /**
   * Handle navigation to next step
   * Redirects to terms and conditions page
   */
  const handleNext = () => {
    router.push("/dashboard/store/onboarding/terms");
  };

  /**
   * Handle navigation to previous step
   * Redirects back to shipping methods page
   */
  const handleBack = () => {
    router.push("/dashboard/store/onboarding/shipping");
  };

  return (
    <OnboardingLayout
      title="Payout Setup"
      description="Add your bank account details to receive payments from sales"
    >
      <PayoutForm onNextAction={handleNext} onBackAction={handleBack} />
    </OnboardingLayout>
  );
}
