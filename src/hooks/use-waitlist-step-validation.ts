"use client";

import { useCallback, useState } from "react";
import type {
  WaitlistFormData,
  WaitlistFormErrors,
  WaitlistStepValidationResult,
} from "@/types/waitlist-wizard.types";

export interface UseWaitlistStepValidationReturn {
  errors: WaitlistFormErrors;
  validateStep: (
    step: number,
    formData: WaitlistFormData,
    sampleFiles: File[],
  ) => WaitlistStepValidationResult;
  clearFieldError: (field: keyof WaitlistFormData | "productSamples") => void;
  setErrors: (errors: WaitlistFormErrors) => void;
  clearErrors: () => void;
}

export function useWaitlistStepValidation(): UseWaitlistStepValidationReturn {
  const [errors, setErrors] = useState<WaitlistFormErrors>({});

  // ─── Step 1: Business & Contact ───────────────────────────────────────────

  const validateBusinessContact = useCallback(
    (formData: WaitlistFormData): WaitlistStepValidationResult => {
      const stepErrors: WaitlistFormErrors = {};

      if (!formData.businessName.trim()) {
        stepErrors.businessName = "Business name is required";
      }

      if (!formData.ownerName.trim()) {
        stepErrors.ownerName = "Your name is required";
      }

      if (!formData.email.trim()) {
        stepErrors.email = "Email address is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        stepErrors.email = "Please enter a valid email address";
      }

      if (!formData.phone.trim()) {
        stepErrors.phone = "Phone number is required";
      } else if (formData.phone.trim().length < 7) {
        stepErrors.phone = "Please enter a valid phone number";
      }

      if (!formData.institution.trim()) {
        stepErrors.institution =
          "Please select an institution close to your business";
      }

      if (!formData.stateOfApplicant.trim()) {
        stepErrors.stateOfApplicant = "State is required";
      }

      if (!formData.cityOfApplicant.trim()) {
        stepErrors.cityOfApplicant = "City is required";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  // ─── Step 2: Category & Model ─────────────────────────────────────────────

  const validateCategoryModel = useCallback(
    (formData: WaitlistFormData): WaitlistStepValidationResult => {
      const stepErrors: WaitlistFormErrors = {};

      if (!formData.categoryId) {
        stepErrors.categoryId = "Please select a category";
      }

      if (!formData.subCategory) {
        stepErrors.subCategory = "Please select a subcategory";
      }

      if (!formData.estimatedInventorySize) {
        stepErrors.estimatedInventorySize = "Please select your inventory size";
      }

      if (formData.estimatedPriceMin <= 0) {
        stepErrors.estimatedPriceMin = "Please enter a minimum price";
      }

      if (formData.estimatedPriceMax <= 0) {
        stepErrors.estimatedPriceMax = "Please enter a maximum price";
      } else if (formData.estimatedPriceMax < formData.estimatedPriceMin) {
        stepErrors.estimatedPriceMax =
          "Max price must be greater than min price";
      }

      if (formData.isDropshipper === null) {
        stepErrors.isDropshipper = "Please indicate if you are a dropshipper";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  // ─── Step 3: Business Proof & Samples ────────────────────────────────────

  const validateProofSamples = useCallback(
    (
      formData: WaitlistFormData,
      sampleFiles: File[],
    ): WaitlistStepValidationResult => {
      const stepErrors: WaitlistFormErrors = {};

      const hasProof =
        formData.cacNumber.trim() ||
        formData.instagramHandle.trim() ||
        formData.otherProofUrl.trim();

      if (!hasProof) {
        stepErrors.cacNumber =
          "At least one form of business proof is required (CAC, Instagram, or link)";
      }

      if (sampleFiles.length === 0) {
        stepErrors.productSamples =
          "At least one product sample image is required";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  // ─── Dispatch ─────────────────────────────────────────────────────────────

  const validateStep = useCallback(
    (
      step: number,
      formData: WaitlistFormData,
      sampleFiles: File[],
    ): WaitlistStepValidationResult => {
      let result: WaitlistStepValidationResult;

      switch (step) {
        case 0:
          result = validateBusinessContact(formData);
          break;
        case 1:
          result = validateCategoryModel(formData);
          break;
        case 2:
          result = validateProofSamples(formData, sampleFiles);
          break;
        default:
          result = { isValid: true, errors: {} };
      }

      if (!result.isValid) {
        setErrors(result.errors);
      }

      return result;
    },
    [validateBusinessContact, validateCategoryModel, validateProofSamples],
  );

  const clearFieldError = useCallback(
    (field: keyof WaitlistFormData | "productSamples") => {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof WaitlistFormErrors];
        return next;
      });
    },
    [],
  );

  const clearErrors = useCallback(() => setErrors({}), []);

  return {
    errors,
    validateStep,
    clearFieldError,
    setErrors,
    clearErrors,
  };
}
