"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type {
  EditProductFormData,
  ProductEditWizardProps,
} from "../../../types/edit-wizard.types";
import { EditWizardStep } from "../../../types/edit-wizard.types";
import {
  BasicInfoStep,
  PricingInventoryStep,
  CategoryAudienceStep,
  ProductImagesStep,
  ReviewPublishStep,
} from "./edit-wizzard-steps";
import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";
import { scrollToTop } from "@/lib/utils";
import { slugify } from "@/constants/constant";
import { ProductValidationErrors } from "../../../domain/products/decorators/validate-product-info";
import { useWizardNavigation } from "@/hooks/use-wizard-navigation.edit";
import { useStepValidation } from "@/hooks/use-step-validation.edit";
import { useProductImages } from "@/hooks/use-product-images.edit";
import { WizardProgressIndicator } from "./wizard-progress-indicator";

/**
 * Product Edit Wizard Component
 * Multi-step form for editing existing products
 * Follows the same architecture as ProductUploadWizard
 */
export function ProductEditWizard({
  storeId,
  productId,
  initialProductData,
}: ProductEditWizardProps) {
  const router = useRouter();

  // Navigation and validation
  const {
    currentStep,
    nextStep,
    previousStep,
    setCurrentStep,
    getErrorStep,
    stepProgress,
  } = useWizardNavigation();

  const {
    errors,
    validateStep,
    validatePublish,
    setErrors,
    clearErrors,
    clearFieldError,
  } = useStepValidation();

  // 1. Manage all image state here in the parent
  const { imageFiles, imagePreviews, handleImageChange, removeImage } =
    useProductImages({
      existingImageCount: initialProductData.images?.length || 0,
    });

  // 2. Prepare the images object to pass down
  const imagesState = {
    existingUrls: initialProductData.images || [],
    newFiles: imageFiles,
    previewUrls: imagePreviews,
  };

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resError, setResError] = useState<Record<string, string> | null>(null);

  // Form state
  const [formData, setFormData] = useState<EditProductFormData>({
    id: initialProductData.id,
    name: initialProductData.name || "",
    description: initialProductData.description || "",
    specifications: initialProductData.specifications || "",
    price: initialProductData.price || 0,
    productQuantity: initialProductData.productQuantity || 0,
    category: initialProductData.category || [],
    subCategory: initialProductData.subCategory || [],
    targetAudience: initialProductData.targetAudience || [],
    images: initialProductData.images || [],
    status: initialProductData.status,
    storePassword: "",
    firstApprovedAt: initialProductData.firstApprovedAt,
    productType: initialProductData.productType,
  });

  /**
   * Handle field changes
   */
  const handleFieldChange = useCallback(
    (field: keyof EditProductFormData, value: string | number) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field
      if (errors[field]) {
        clearFieldError(field);
      }
    },
    [errors, setErrors],
  );

  /**
   * Validate and move to next step
   */
  const handleNextStep = async () => {
    const validation = validateStep(currentStep, formData, imageFiles);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    clearErrors();
    await nextStep(false);
  };

  /**
   * Handle previous step
   */
  const handlePreviousStep = useCallback(async () => {
    const success = await previousStep();
    if (success) {
      // Scroll to top
      scrollToTop();
    }
  }, [previousStep]);

  /**
   * Prepare form data for submission - only send changed fields
   */
  const prepareFormData = (action: "draft" | "publish"): FormData => {
    const payload = new FormData();

    payload.append("name", formData.name);
    if (formData.description) {
      payload.append("description", formData.description);
    }
    if (formData.specifications) {
      payload.append("specifications", formData.specifications);
    }
    payload.append("price", String(formData.price));
    payload.append("productQuantity", String(formData.productQuantity));
    payload.append("storePassword", formData.storePassword);
    payload.append("storeId", storeId);
    payload.append("submitAction", action);

    (formData.category || []).forEach((cat) =>
      payload.append("category", slugify(cat)),
    );

    (formData.subCategory || []).forEach((sub) =>
      payload.append("subCategory", slugify(sub)),
    );

    (formData.targetAudience || []).forEach((aud) =>
      payload.append("targetAudience", slugify(aud)),
    );

    // Append new files
    imageFiles.forEach((file) => {
      payload.append("images", file);
    });

    // Append existing URLs to keep
    imagesState.existingUrls.forEach((url) => {
      payload.append("oldImageURLs", url);
    });

    return payload;
  };

  /**
   * Submit product changes
   */
  const submitProduct = async (action: "draft" | "publish") => {
    const payload = prepareFormData(action);

    const response = await fetch(`/api/store/products/${productId}`, {
      method: "PUT",
      body: payload,
    });

    if (!response.ok) {
      const { message, errors } = (await parseErrorFromResponse(response)) as {
        message: string;
        errors: ProductValidationErrors;
      };
      if (errors) {
        const firstValidationError = Object.keys(
          errors,
        )[0] as keyof ProductValidationErrors;
        setCurrentStep(getErrorStep(firstValidationError));
        setResError(errors);
        scrollToTop();
      }
      throw new Error(message);
    }

    return response.json();
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (action: "draft" | "publish") => {
    // Validate entire form
    const validation = validatePublish(
      formData,
      imageFiles,
      formData.storePassword,
    );
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error("Please fix validation errors");
      return;
    }

    try {
      setResError(null);
      setIsLoading(true);
      setUploadProgress(20);

      await submitProduct(action);
      setUploadProgress(100);

      toast.success(
        action === "draft"
          ? "Product changes saved as draft"
          : "Product updated successfully",
      );

      if (action === "publish") {
        router.push(`/store/${storeId}/products`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update product";
      toast.error(message);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  /**
   * Render step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case EditWizardStep.BasicInfo:
        return (
          <BasicInfoStep
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
            onNext={handleNextStep}
          />
        );
      case EditWizardStep.PricingInventory:
        return (
          <PricingInventoryStep
            formData={formData}
            errors={errors}
            onFieldChange={handleFieldChange}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        );
      case EditWizardStep.CategoryAudience:
        return (
          <CategoryAudienceStep
            formData={formData}
            errors={errors}
            onFieldChange={(field, value) => {
              setFormData((prev) => ({
                ...prev,
                [field]: value,
              }));
            }}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        );
      case EditWizardStep.ProductImages:
        return (
          <ProductImagesStep
            images={imagesState}
            onImagesChange={(file) => {
              handleImageChange(file);
            }} // If needed for custom triggers
            onRemoveImage={removeImage} // Pass the handler down
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            isLoading={isLoading}
            errors={errors}
          />
        );
      case EditWizardStep.ReviewPublish:
        return (
          <ReviewPublishStep
            formData={formData}
            images={{
              existingUrls: initialProductData.images ?? [],
              newFiles: imageFiles,
              previewUrls: imagePreviews,
            }}
            errors={errors}
            uploadProgress={uploadProgress}
            isLoading={isLoading}
            onFormDataChange={handleFieldChange}
            onPublish={() => handleSubmit("publish")}
            onPrevious={handlePreviousStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Product</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Update your product details step by step
          </p>
        </div>

        {/* Progress */}
        <WizardProgressIndicator
          currentStep={currentStep}
          totalSteps={5}
          stepProgress={stepProgress}
        />

        {/* Error Alert */}
        {resError && (
          <Alert variant="destructive" className="my-6 bg-transparent">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {Object.entries(resError).map(([field, message]) => (
                <div key={field}>
                  <strong>
                    {field.charAt(0).toUpperCase() + field.slice(1)}:
                  </strong>{" "}
                  {message}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="max-w-4xl mx-auto my-8">{renderStepContent()}</div>
      </div>
    </div>
  );
}
