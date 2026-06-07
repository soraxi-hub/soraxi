"use client";

import { useCallback, useState } from "react";
import type { WizardStep } from "../types/upload-wizard.types";

/**
 * useWizardNavigation Hook
 *
 * Manages navigation through the product upload wizard:
 * - Current step state management
 * - Next/previous/go-to-step navigation
 * - Step validation before navigation
 * - Navigation callbacks
 *
 * @param initialStep - Initial step to start on (default: 0)
 * @param totalSteps - Total number of steps (default: 5)
 * @param onBeforeNext - Callback before moving to next step
 * @param onBeforePrevious - Callback before moving to previous step
 *
 * @example
 * const {
 *   currentStep,
 *   nextStep,
 *   previousStep,
 *   goToStep,
 *   canGoNext,
 *   canGoPrevious,
 *   stepProgress,
 * } = useWizardNavigation();
 */

export interface UseWizardNavigationReturn {
  currentStep: WizardStep;
  nextStep: (validate?: boolean) => Promise<boolean>;
  previousStep: () => Promise<boolean>;
  goToStep: (step: WizardStep | number) => Promise<boolean>;
  canGoNext: () => boolean;
  canGoPrevious: () => boolean;
  stepProgress: number;
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
  setCurrentStep: (step: WizardStep | number) => void;
}

export function useWizardNavigation(
  initialStep: WizardStep | number = 0,
  totalSteps: number = 5,
  onBeforeNext?: () => Promise<boolean> | boolean,
  onBeforePrevious?: () => Promise<boolean> | boolean,
): UseWizardNavigationReturn {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [currentStep, setCurrentStep] = useState<number>(initialStep);

  // ============================================================================
  // NAVIGATION HELPERS
  // ============================================================================

  /**
   * Check if we can advance to the next step
   */
  const canGoNext = useCallback(() => {
    return currentStep < totalSteps - 1;
  }, [currentStep, totalSteps]);

  /**
   * Check if we can go back to the previous step
   */
  const canGoPrevious = useCallback(() => {
    return currentStep > 0;
  }, [currentStep]);

  /**
   * Check if we're on the first step
   */
  const isFirstStep = useCallback(() => {
    return currentStep === 0;
  }, [currentStep]);

  /**
   * Check if we're on the last step
   */
  const isLastStep = useCallback(() => {
    return currentStep === totalSteps - 1;
  }, [currentStep, totalSteps]);

  /**
   * Calculate step progress as percentage (0-100)
   */
  const stepProgress = Math.round(((currentStep + 1) / totalSteps) * 100);

  // ============================================================================
  // NAVIGATION FUNCTIONS
  // ============================================================================

  /**
   * Move to the next step
   * Calls onBeforeNext callback if provided
   * Returns true if navigation was successful, false otherwise
   */
  const nextStep = useCallback(
    async (validate: boolean = true): Promise<boolean> => {
      // Check if we can advance
      if (!canGoNext()) {
        return false;
      }

      // Call before-next callback if provided
      if (validate && onBeforeNext) {
        const canProceed = await Promise.resolve(onBeforeNext());
        if (!canProceed) {
          return false;
        }
      }

      // Move to next step
      setCurrentStep((prev) => prev + 1);
      return true;
    },
    [canGoNext, onBeforeNext],
  );

  /**
   * Move to the previous step
   * Calls onBeforePrevious callback if provided
   * Returns true if navigation was successful, false otherwise
   */
  const previousStep = useCallback(async (): Promise<boolean> => {
    // Check if we can go back
    if (!canGoPrevious()) {
      return false;
    }

    // Call before-previous callback if provided
    if (onBeforePrevious) {
      const canProceed = await Promise.resolve(onBeforePrevious());
      if (!canProceed) {
        return false;
      }
    }

    // Move to previous step
    setCurrentStep((prev) => prev - 1);
    return true;
  }, [canGoPrevious, onBeforePrevious]);

  /**
   * Jump directly to a specific step
   * Validates the target step is within range
   * Returns true if navigation was successful, false otherwise
   */
  const goToStep = useCallback(
    async (step: WizardStep | number): Promise<boolean> => {
      // Validate step is within range
      if (step < 0 || step >= totalSteps) {
        return false;
      }

      // Set step
      setCurrentStep(step);
      return true;
    },
    [totalSteps],
  );

  /**
   * Set the current step directly
   * Used for external updates to the current step
   */
  const setStep = useCallback(
    (step: WizardStep | number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps],
  );

  return {
    currentStep: currentStep as WizardStep,
    nextStep,
    previousStep,
    goToStep,
    canGoNext,
    canGoPrevious,
    stepProgress,
    isFirstStep,
    isLastStep,
    setCurrentStep: setStep,
  };
}
