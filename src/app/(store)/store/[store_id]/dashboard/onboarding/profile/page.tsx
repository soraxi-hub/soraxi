"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { StoreProfileForm } from "@/components/forms/StoreProfileForm";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";

/**
 * Store Profile Onboarding Page
 * First step in the onboarding process - collects basic store information
 */
export default function StoreProfilePage() {
  const router = useRouter();
  const { setCurrentStep } = useStoreOnboarding();

  useEffect(() => {
    // Set current step when component mounts
    setCurrentStep(0);
  }, [setCurrentStep]);

  /**
   * Handle navigation to next step
   * Redirects to business information page
   */
  const handleNext = () => {
    router.push("/dashboard/store/onboarding/business-info");
  };

  return (
    <OnboardingLayout
      title="Store Profile"
      description="Let's start by setting up your store's basic information and branding"
      showBackButton={false}
    >
      <StoreProfileForm onNextAction={handleNext} />
    </OnboardingLayout>
  );
}
