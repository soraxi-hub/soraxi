"use client";

import {
  StoreOnboardingProvider,
  useStoreOnboarding,
} from "@/contexts/StoreOnboardingContext";
import { IShippingMethod } from "@/lib/db/models/store.model";
import axios from "axios";
import { useEffect } from "react";

interface Store {
  storeId: string;
  data: {
    profile: {
      name: string;
      description: string | undefined;
      logoUrl: string | undefined;
      bannerUrl: string | undefined;
    };
    "business-info": {};
    shipping: IShippingMethod[];
    terms: Date | undefined;
  };
  progress: {
    currentStep: number;
    completedSteps: string[];
    totalSteps: number;
    percentage: number;
  };
}

function OnboardingInitializer() {
  const {
    setStoreId,
    initializeData,
    setCurrentStep,
    markStepCompleted,
    setLoading,
    setError,
  } = useStoreOnboarding();

  useEffect(() => {
    const fetchOnboardingDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<{ store: Store }>(
          "/api/store/onboarding/onboarding-details"
        );

        const { store } = response.data;

        const { storeId, data, progress } = store;

        // console.log("store", store);

        if (storeId) setStoreId(storeId);
        if (data) initializeData(data);
        if (progress?.currentStep !== undefined) {
          setCurrentStep(progress.currentStep);
        }
        if (progress?.completedSteps?.length) {
          for (const stepId of progress.completedSteps) {
            markStepCompleted(stepId);
          }
        }
      } catch (error) {
        console.error("Failed to load onboarding details:", error);
        setError("Failed to load onboarding data.");
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingDetails();
  }, [
    setStoreId,
    initializeData,
    setCurrentStep,
    markStepCompleted,
    setLoading,
    setError,
  ]);

  return null; // This just hydrates the context
}

/**
 * Onboarding Layout
 * Wraps all onboarding pages with the StoreOnboardingProvider
 * This ensures onboarding state is available throughout the flow
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreOnboardingProvider>
      <OnboardingInitializer />
      {children}
    </StoreOnboardingProvider>
  );
}
