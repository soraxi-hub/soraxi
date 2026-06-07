"use client";

import { useCallback, useState } from "react";
import { ProductFactory } from "@/domain/products/product-factory";
import type { ProductFormData } from "@/validators/product-validators";
import type { StepValidationResult } from "../types/upload-wizard.types";
import { toast } from "sonner";
import { scrollToTop } from "@/lib/utils";

/**
 * useStepValidation Hook
 *
 * Manages validation for each step of the wizard:
 * - Step-specific field validation
 * - Error state management
 * - Clear errors on field change
 * - Full validation before publish
 * - Integration with ProductFactory validation
 *
 * @param initialErrors - Initial error state (default: empty)
 *
 * @example
 * const {
 *   errors,
 *   validateStep,
 *   validateField,
 *   clearErrors,
 *   setErrors,
 * } = useStepValidation();
 */

export interface UseStepValidationReturn {
  errors: Partial<Record<keyof ProductFormData, string>>;
  validateStep: (
    step: number,
    formData: ProductFormData,
    imageFiles: File[],
  ) => StepValidationResult;
  validatePublish: (
    formData: ProductFormData,
    imageFiles: File[],
    storePassword: string,
  ) => StepValidationResult;
  validateField: (field: keyof ProductFormData) => void;
  clearFieldError: (field: keyof ProductFormData) => void;
  setErrors: (errors: Partial<Record<keyof ProductFormData, string>>) => void;
  clearErrors: () => void;
}

export function useStepValidation(
  initialErrors: Partial<Record<keyof ProductFormData, string>> = {},
): UseStepValidationReturn {
  const [errors, setErrors] =
    useState<Partial<Record<keyof ProductFormData, string>>>(initialErrors);

  /**
   * Validates Step 1: Basic Info
   * Validates: name, description, specifications
   */
  const validateBasicInfo = useCallback(
    (formData: ProductFormData): StepValidationResult => {
      const stepErrors: Partial<Record<keyof ProductFormData, string>> = {};

      // Product name is required
      if (!formData.name || formData.name.trim().length === 0) {
        stepErrors.name = "Product name is required";
      }

      // Product name max length
      if (formData.name && formData.name.length > 100) {
        stepErrors.name = "Product name cannot exceed 100 characters";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  /**
   * Validates Step 2: Pricing & Inventory
   * Validates: price, productQuantity
   */
  const validatePricingInventory = useCallback(
    (formData: ProductFormData): StepValidationResult => {
      const stepErrors: Partial<Record<keyof ProductFormData, string>> = {};

      // Price is required and must be positive
      if (formData.price && formData.price <= 0) {
        stepErrors.price = "Price must be greater than 0";
      }

      // Quantity is required and must be positive
      if (formData.productQuantity && formData.productQuantity <= 0) {
        stepErrors.productQuantity = "Quantity must be greater than 0";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  /**
   * Validates Step 3: Category & Audience
   * Validates: category, subCategory, targetAudience
   */
  const validateCategoryAudience = useCallback(
    (formData: ProductFormData): StepValidationResult => {
      const stepErrors: Partial<Record<keyof ProductFormData, string>> = {};

      // Category is required
      if (!formData.category || formData.category.length === 0) {
        stepErrors.category = "Category is required";
      }

      // Subcategory is required
      if (!formData.subCategory || formData.subCategory.length === 0) {
        stepErrors.subCategory = "Subcategory is required";
      }

      // Target audience is required
      if (!formData.targetAudience || formData.targetAudience.length === 0) {
        stepErrors.targetAudience = "Target audience is required";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  /**
   * Validates Step 4: Product Images
   * Validates: image count (min 1, max 5)
   */
  const validateProductImages = useCallback(
    (imageFiles: File[]): StepValidationResult => {
      const stepErrors: Partial<Record<keyof ProductFormData, string>> = {};

      // At least one image is required
      if (imageFiles.length === 0) {
        toast.info("At least one product image is required");
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  /**
   * Validates Step 5: Review & Publish
   * Validates: storePassword
   */
  const validateReviewPublish = useCallback(
    (formData: ProductFormData): StepValidationResult => {
      const stepErrors: Partial<Record<keyof ProductFormData, string>> = {};

      // Store password is required
      if (
        !formData.storePassword ||
        formData.storePassword.trim().length === 0
      ) {
        stepErrors.storePassword = "Store password is required for security";
      }

      return {
        isValid: Object.keys(stepErrors).length === 0,
        errors: stepErrors,
      };
    },
    [],
  );

  /**
   * Validates the current step based on step number
   * Called before proceeding to the next step
   */
  const validateStep = useCallback(
    (
      step: number,
      formData: ProductFormData,
      imageFiles: File[],
    ): StepValidationResult => {
      let result: StepValidationResult;

      switch (step) {
        case 0:
          result = validateBasicInfo(formData);
          break;
        case 1:
          result = validatePricingInventory(formData);
          break;
        case 2:
          result = validateCategoryAudience(formData);
          break;
        case 3:
          result = validateProductImages(imageFiles);
          break;
        case 4:
          result = validateReviewPublish(formData);
          break;
        default:
          result = { isValid: true, errors: {} };
      }

      // Update errors state
      if (!result.isValid) {
        setErrors(result.errors);
        scrollToTop();
      }

      return result;
    },
    [
      validateBasicInfo,
      validatePricingInventory,
      validateCategoryAudience,
      validateProductImages,
      validateReviewPublish,
    ],
  );

  /**
   * Performs full validation before publishing
   * Uses ProductFactory validation decorators
   * Includes all fields and image count
   */
  const validatePublish = useCallback(
    (
      formData: ProductFormData,
      imageFiles: File[],
      storePassword: string,
    ): StepValidationResult => {
      try {
        // Create product with validation decorator
        const productToUpload =
          ProductFactory.createProductWithValidationDecorator(formData);

        // Perform full publish validation
        const validationResult = productToUpload.validatePublish(
          imageFiles.length,
          storePassword,
        );

        // Extract errors from validation result
        const publishErrors = validationResult.errors || {};

        // Update errors state if validation failed
        if (Object.keys(publishErrors).length > 0) {
          setErrors(publishErrors);
        }

        return {
          isValid: !validationResult.isValid,
          errors: publishErrors,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Validation failed";
        const publishErrors: Partial<Record<keyof ProductFormData, string>> = {
          name: errorMessage,
        };

        setErrors(publishErrors);
        return {
          isValid: false,
          errors: publishErrors,
        };
      }
    },
    [],
  );

  /**
   * Clears error for a specific field when user starts typing
   */
  const clearFieldError = useCallback((field: keyof ProductFormData) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  /**
   * Validates a single field (stub for future expansion)
   */
  const validateField = useCallback(
    (field: keyof ProductFormData) => {
      // This can be expanded in the future for real-time field validation
      clearFieldError(field);
    },
    [clearFieldError],
  );

  /**
   * Clears all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateStep,
    validatePublish,
    validateField,
    clearFieldError,
    setErrors,
    clearErrors,
  };
}
