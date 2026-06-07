"use client";

import { useState, useCallback } from "react";
import {
  TOTAL_EDIT_WIZARD_STEPS,
  EditProductFormData,
  EditWizardStep,
  UseWizardNavigationReturn,
} from "@/types/edit-wizard.types";

interface UseWizardNavigationProps {
  onValidate?: (step: number) => Promise<boolean>;
}

/**
 * Hook to manage navigation through the edit wizard steps
 * Handles step progression, validation, and state tracking
 */
export function useWizardNavigation({
  onValidate,
}: UseWizardNavigationProps = {}): UseWizardNavigationReturn {
  const [currentStep, setCurrentStep] = useState<EditWizardStep>(0);
  const [_completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const getErrorStep = (value: keyof EditProductFormData) => {
    switch (value) {
      case "name":
      case "description":
      case "specifications":
        return 0;

      case "price":
      case "productQuantity":
        return 1;

      case "category":
      case "subCategory":
      case "targetAudience":
        return 2;

      case "images":
        return 3;
      default:
        return 0;
    }
  };

  /**
   * Mark a step as completed
   */
  const markStepCompleted = useCallback((step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  /**
   * Navigate to next step with optional validation
   */
  const nextStep = useCallback(
    async (validate = true): Promise<boolean> => {
      // Check if already at last step
      if (currentStep >= TOTAL_EDIT_WIZARD_STEPS - 1) {
        return false;
      }

      // Validate current step if requested
      if (validate && onValidate) {
        const isValid = await onValidate(currentStep);
        if (!isValid) {
          return false;
        }
      }

      // Mark current step as completed and move to next
      markStepCompleted(currentStep);
      setCurrentStep((prev) => (prev + 1) as EditWizardStep);
      return true;
    },
    [currentStep, onValidate, markStepCompleted],
  );

  /**
   * Navigate to previous step
   */
  const previousStep = useCallback(async (): Promise<boolean> => {
    if (currentStep <= 0) {
      return false;
    }

    setCurrentStep((prev) => (prev - 1) as EditWizardStep);
    return true;
  }, [currentStep]);

  /**
   * Jump to a specific step (with validation of intermediate steps)
   */
  const goToStep = useCallback(
    async (step: EditWizardStep | number): Promise<boolean> => {
      const targetStep = typeof step === "number" ? step : step;

      // Validate bounds
      if (targetStep < 0 || targetStep >= TOTAL_EDIT_WIZARD_STEPS) {
        return false;
      }

      // If moving backward, allow directly
      if (targetStep < currentStep) {
        setCurrentStep(targetStep as EditWizardStep);
        return true;
      }

      // If moving forward, validate intermediate steps
      if (targetStep > currentStep && onValidate) {
        for (let i = currentStep; i < targetStep; i++) {
          const isValid = await onValidate(i);
          if (!isValid) {
            return false;
          }
          markStepCompleted(i);
        }
      }

      setCurrentStep(targetStep as EditWizardStep);
      return true;
    },
    [currentStep, onValidate, markStepCompleted],
  );

  /**
   * Check if can move to next step
   */
  const canGoNext = useCallback((): boolean => {
    return currentStep < TOTAL_EDIT_WIZARD_STEPS - 1;
  }, [currentStep]);

  /**
   * Check if can move to previous step
   */
  const canGoPrevious = useCallback((): boolean => {
    return currentStep > 0;
  }, [currentStep]);

  /**
   * Calculate progress as percentage
   */
  const stepProgress = Math.round(
    ((currentStep + 1) / TOTAL_EDIT_WIZARD_STEPS) * 100,
  );

  /**
   * Check if at first step
   */
  const isFirstStep = useCallback((): boolean => {
    return currentStep === 0;
  }, [currentStep]);

  /**
   * Check if at last step
   */
  const isLastStep = useCallback((): boolean => {
    return currentStep === TOTAL_EDIT_WIZARD_STEPS - 1;
  }, [currentStep]);

  return {
    currentStep,
    nextStep,
    previousStep,
    goToStep,
    canGoNext,
    canGoPrevious,
    stepProgress,
    isFirstStep,
    isLastStep,
    setCurrentStep,
    getErrorStep,
  };
}
