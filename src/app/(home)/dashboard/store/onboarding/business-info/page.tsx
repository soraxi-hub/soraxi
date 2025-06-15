"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { BusinessInfoForm } from "@/components/forms/BusinessInfoForm";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";

/**
 * Business Information Onboarding Page
 * Second step in the onboarding process - collects business registration details
 */
export default function BusinessInfoPage() {
  const router = useRouter();
  const { setCurrentStep } = useStoreOnboarding();

  useEffect(() => {
    // Set current step when component mounts
    setCurrentStep(1);
  }, [setCurrentStep]);

  /**
   * Handle navigation to next step
   * Redirects to shipping configuration page
   */
  const handleNext = () => {
    router.push("/dashboard/store/onboarding/shipping");
  };

  /**
   * Handle navigation to previous step
   * Redirects back to store profile page
   */
  const handleBack = () => {
    router.push("/dashboard/store/onboarding/profile");
  };

  return (
    <OnboardingLayout
      title="Business Information"
      description="Provide your business details for verification and compliance"
    >
      <BusinessInfoForm onNextAction={handleNext} onBackAction={handleBack} />
    </OnboardingLayout>
  );
}
