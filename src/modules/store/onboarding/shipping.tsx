"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { ShippingMethodsForm } from "@/components/forms/shipping-methods-form";
import { useStoreOnboarding } from "@/contexts/store-onboarding-context";

/**
 * Shipping Methods Onboarding Page
 * Second step in the onboarding process - configures shipping options
 */
export default function ShippingPage({ storeId }: { storeId: string }) {
  const router = useRouter();
  const { setCurrentStep } = useStoreOnboarding();

  useEffect(() => {
    // Set current step when component mounts
    setCurrentStep(1);
  }, [setCurrentStep]);

  /**
   * Handle navigation to next step
   * Redirects to the terms page
   */
  const handleNext = () => {
    router.push(`/store/onboarding/${storeId}/terms`);
  };

  /**
   * Handle navigation to previous step
   * Redirects back to the store profile page
   */
  const handleBack = () => {
    router.push(`/store/onboarding/${storeId}/profile`);
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
