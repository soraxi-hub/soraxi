"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { ShippingMethodsForm } from "@/components/forms/ShippingMethodsForm";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";

/**
 * Shipping Methods Onboarding Page
 * Third step in the onboarding process - configures shipping options
 */
export default function ShippingPage({ storeId }: { storeId: string }) {
  const router = useRouter();
  const { setCurrentStep } = useStoreOnboarding();

  useEffect(() => {
    // Set current step when component mounts
    setCurrentStep(2);
  }, [setCurrentStep]);

  /**
   * Handle navigation to next step
   * Redirects to payout setup page
   */
  const handleNext = () => {
    router.push(`/store/onboarding/${storeId}/terms`);
  };

  /**
   * Handle navigation to previous step
   * Redirects back to business information page
   */
  const handleBack = () => {
    router.push(`/store/onboarding/${storeId}/business-info`);
  };

  return (
    <OnboardingLayout
      title="Shipping Methods"
      description="Configure how you'll deliver products to your customers"
      onBack={handleBack}
    >
      <ShippingMethodsForm
        onNextAction={handleNext}
        onBackAction={handleBack}
      />
    </OnboardingLayout>
  );
}
