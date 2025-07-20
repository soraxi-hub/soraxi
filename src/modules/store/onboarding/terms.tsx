"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { TermsForm } from "@/components/forms/TermsForm";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";

/**
 * Terms and Conditions Onboarding Page
 * Final step in the onboarding process - agreement to platform terms
 */
export default function TermsPage({ storeId }: { storeId: string }) {
  const router = useRouter();
  const { setCurrentStep } = useStoreOnboarding();

  useEffect(() => {
    // Set current step when component mounts
    setCurrentStep(3);
  }, [setCurrentStep]);

  /**
   * Handle navigation to previous step
   * Redirects back to payout setup page
   */
  const handleBack = () => {
    router.push(`/store/onboarding/${storeId}/shipping`);
  };

  return (
    <OnboardingLayout
      title="Terms & Conditions"
      description="Review and agree to our terms to complete your store setup"
      showBackButton={true}
      onBack={handleBack}
    >
      <TermsForm onBackAction={handleBack} />
    </OnboardingLayout>
  );
}
