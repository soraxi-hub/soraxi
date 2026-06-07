"use client";

import { useState, useCallback } from "react";
import type {
  EditProductFormData,
  EditWizardStep,
  StepValidationResult,
  UseStepValidationReturn,
} from "../types/edit-wizard.types";
import { EditWizardStep as EditStep } from "../types/edit-wizard.types";
import { MAX_PRODUCT_IMAGES } from "@/constants/image.constants";

/**
 * Hook for validating edit wizard steps and form data
 * Provides step-level and full-form validation
 */
export function useStepValidation(): UseStepValidationReturn {
  const [errors, setErrors] = useState<
    Partial<Record<keyof EditProductFormData, string>>
  >({});

  /**
   * Validate step 0: Basic Info (name, description, specifications)
   */
  const validateBasicInfoStep = useCallback(
    (formData: EditProductFormData): StepValidationResult => {
      const stepErrors: Partial<Record<keyof EditProductFormData, string>> = {};

      // Name validation
      if (!formData.name || formData.name.trim().length === 0) {
        stepErrors.name = "Product name is required";
      } else if (formData.name.length < 3) {
        stepErrors.name = "Product name must be at least 3 characters";
      } else if (formData.name.length > 100) {
        stepErrors.name = "Product name cannot exceed 100 characters";
      }

      // Description validation (optional field)
      if (formData.description && formData.description.length > 10000) {
        stepErrors.description =
          "Product description cannot exceed 10000 characters";
      }

      // Specifications validation (optional field)
      if (formData.specifications && formData.specifications.length > 10000) {
        stepErrors.specifications =
          "Product specifications cannot exceed 10000 characters";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  /**
   * Validate step 1: Pricing & Inventory
   */
  const validatePricingInventoryStep = useCallback(
    (formData: EditProductFormData): StepValidationResult => {
      const stepErrors: Partial<Record<keyof EditProductFormData, string>> = {};

      // Price validation
      if (formData.price === undefined || formData.price === null) {
        stepErrors.price = "Price is required";
      } else if (Number(formData.price) <= 0) {
        stepErrors.price = "Price must be greater than 0";
      }

      // Quantity validation
      if (
        formData.productQuantity === undefined ||
        formData.productQuantity === null
      ) {
        stepErrors.productQuantity = "Quantity is required";
      } else if (Number(formData.productQuantity) < 0) {
        stepErrors.productQuantity = "Quantity cannot be negative";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  /**
   * Validate step 2: Category & Audience
   */
  const validateCategoryAudienceStep = useCallback(
    (formData: EditProductFormData): StepValidationResult => {
      const stepErrors: Partial<Record<keyof EditProductFormData, string>> = {};

      // Category validation
      if (!formData.category || formData.category.length === 0) {
        stepErrors.category = "Please select a category";
      }

      // Subcategory validation
      if (!formData.subCategory || formData.subCategory.length === 0) {
        stepErrors.subCategory = "Please select a subcategory";
      }

      // Target audience validation
      if (!formData.targetAudience || formData.targetAudience.length === 0) {
        stepErrors.targetAudience = "Please select a target audience";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  /**
   * Validate step 3: Product Images
   */
  const validateProductImagesStep = useCallback(
    (
      formData: EditProductFormData,
      imageFiles: File[],
    ): StepValidationResult => {
      const stepErrors: Partial<Record<keyof EditProductFormData, string>> = {};

      const totalImages = (formData.images?.length || 0) + imageFiles.length;

      // At least 1 image required
      if (totalImages === 0) {
        stepErrors.images = "At least 1 product image is required";
      }

      // Maximum images check
      if (totalImages > MAX_PRODUCT_IMAGES) {
        stepErrors.images = `Maximum ${MAX_PRODUCT_IMAGES} images allowed`;
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  /**
   * Validate specific step based on step number
   */
  const validateStep = useCallback(
    (
      step: EditWizardStep,
      formData: EditProductFormData,
      imageFiles: File[],
    ): StepValidationResult => {
      switch (step) {
        case EditStep.BasicInfo:
          return validateBasicInfoStep(formData);
        case EditStep.PricingInventory:
          return validatePricingInventoryStep(formData);
        case EditStep.CategoryAudience:
          return validateCategoryAudienceStep(formData);
        case EditStep.ProductImages:
          return validateProductImagesStep(formData, imageFiles);
        case EditStep.ReviewPublish:
          // Review step has its own validation in submitPublish
          return { isValid: true, errors: {} };
        default:
          return { isValid: true, errors: {} };
      }
    },
    [
      validateBasicInfoStep,
      validatePricingInventoryStep,
      validateCategoryAudienceStep,
      validateProductImagesStep,
    ],
  );

  /**
   * Full form validation before publishing
   */
  const validatePublish = useCallback(
    (
      formData: EditProductFormData,
      imageFiles: File[],
      storePassword: string,
    ): StepValidationResult => {
      const allErrors: Partial<Record<keyof EditProductFormData, string>> = {};

      // Validate all steps
      const basicValid = validateBasicInfoStep(formData);
      const pricingValid = validatePricingInventoryStep(formData);
      const categoryValid = validateCategoryAudienceStep(formData);
      const imagesValid = validateProductImagesStep(formData, imageFiles);

      // Collect all errors
      Object.assign(
        allErrors,
        basicValid.errors,
        pricingValid.errors,
        categoryValid.errors,
        imagesValid.errors,
      );

      // Password validation
      if (!storePassword || storePassword.trim().length === 0) {
        allErrors.storePassword = "Store password is required";
      }

      return {
        isValid: Object.keys(allErrors).length === 0,
        errors: allErrors,
      };
    },
    [
      validateBasicInfoStep,
      validatePricingInventoryStep,
      validateCategoryAudienceStep,
      validateProductImagesStep,
    ],
  );

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((field: keyof EditProductFormData) => {
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  }, []);

  /**
   * Set all errors at once
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateStep,
    validatePublish,
    clearFieldError,
    setErrors,
    clearErrors,
  };
}
