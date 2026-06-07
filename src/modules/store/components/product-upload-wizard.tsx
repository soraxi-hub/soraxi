"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, SaveIcon, Loader2 } from "lucide-react";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";
import { slugify } from "@/constants/constant";
import type { ProductFormData } from "@/validators/product-validators";
import { ProductTypeEnum } from "@/enums";
import { useProductImages } from "@/hooks/use-product-images.upload";
import type { ProductUploadWizardProps } from "../../../types/upload-wizard.types";
import {
  BasicInfoStep,
  PricingInventoryStep,
  CategoryAudienceStep,
  ProductImagesStep,
  ReviewPublishStep,
} from "./upload-wizzard-steps";
import { scrollToTop } from "@/lib/utils";
import { useStepValidation } from "@/hooks/use-step-validation.upload";
import { useWizardNavigation } from "@/hooks/use-wizard-navigation.upload";
import { WizardProgressIndicator } from "./wizard-progress-indicator";

/**
 * Initial form state for comparison
 */
const initialFormData: ProductFormData = {
  name: "",
  description: "",
  specifications: "",
  price: 0,
  productQuantity: 0,
  category: [],
  subCategory: [],
  targetAudience: [],
  storePassword: "",
  productType: ProductTypeEnum.Product,
};

/**
 * ProductUploadWizard Component
 *
 * Main container for the multi-step product upload wizard
 * Orchestrates all step components and manages centralized state
 *
 * Features:
 * - 5-step guided product creation
 * - Centralized state management
 * - Step-level validation
 * - Image upload with drag/drop
 * - Draft save functionality
 * - Unsaved changes protection
 * - Full TypeScript support
 */
export function ProductUploadWizard({ storeId }: ProductUploadWizardProps) {
  const router = useRouter();
  const {
    imageFiles,
    imagePreviews,
    dragActive,
    removeImage,
    setDragActive,
    setImageFiles,
    setImagePreviews,
  } = useProductImages();
  const { errors, validateStep, validatePublish, clearFieldError, setErrors } =
    useStepValidation();
  const { currentStep, nextStep, previousStep, stepProgress } =
    useWizardNavigation(0, 5);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Form data
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState(0);

  // Draft product ID
  const [draftProductId, setDraftProductId] = useState<string | null>(null);

  // Unsaved changes hook
  const {
    showDialog: showUnsavedDialog,
    isSaving: isSavingBeforeLeave,
    setShowDialog: setShowUnsavedDialog,
    handleDialogAction,
    resetDirtyState,
  } = useUnsavedChanges({
    initialData: initialFormData,
    currentData: formData,
    additionalDirtyCheck: imageFiles.length > 0,
    onSaveBeforeLeave: async () => {
      return await handlePublish("draft");
    },
  });

  /**
   * Handle form field changes
   * Updates formData and clears field-specific errors
   */
  const handleFormDataChange = useCallback(
    (field: keyof ProductFormData, value: string | number | string[]) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Clear error for this field
      clearFieldError(field);
    },
    [clearFieldError],
  );

  /**
   * Handle next step with validation
   */
  const handleNextStep = useCallback(async () => {
    // Validate current step
    const validation = validateStep(currentStep, formData, imageFiles);

    if (!validation.isValid) {
      toast.error("Please fix validation errors before proceeding");
      return;
    }

    // Move to next step
    const success = await nextStep();
    if (success) {
      // Scroll to top
      scrollToTop();
    }
  }, [currentStep, formData, imageFiles, validateStep, nextStep]);

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
   * Prepare FormData for submission
   * Converts form data and images into FormData object
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

    if (draftProductId) {
      payload.append("submittedDraftProductId", draftProductId);
    }

    (formData.category || []).forEach((cat) =>
      payload.append("category", slugify(cat)),
    );

    (formData.subCategory || []).forEach((sub) =>
      payload.append("subCategory", slugify(sub)),
    );

    (formData.targetAudience || []).forEach((aud) =>
      payload.append("targetAudience", slugify(aud)),
    );

    imageFiles.forEach((file) => {
      payload.append("images", file);
    });

    return payload;
  };

  /**
   * Submit product to API
   */
  const submitProduct = async (action: "draft" | "publish") => {
    const payload = prepareFormData(action);

    const response = await fetch("/api/store/products", {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      const { message, errors } = await parseErrorFromResponse(response);
      if (errors) {
        setErrors(errors);
      }
      throw new Error(message);
    }

    return response.json() as Promise<{
      success: boolean;
      message: string;
      data: {
        productId: string;
      };
    }>;
  };

  /**
   * Handle publish
   */
  const handlePublish: (action: "draft" | "publish") => Promise<void> =
    useCallback(
      async (action: "draft" | "publish") => {
        // Validate all fields before publishing
        if (action === "publish") {
          const validation = validatePublish(
            formData,
            imageFiles,
            formData.storePassword,
          );

          if (!validation.isValid) {
            toast.error("Please fix validation errors before publishing");
            return;
          }
        }

        try {
          if (action === "draft") {
            setIsLoadingDraft(true);
          } else {
            setIsLoading(true);
          }

          setUploadProgress(20);

          const result = await submitProduct(action);
          setDraftProductId(result?.data?.productId);

          setUploadProgress(100);

          if (action === "publish") {
            toast.success(
              "Your product has been uploaded and is pending review.",
            );
            resetDirtyState();

            // Redirect back
            router.back();
            return;
          }
          toast.success("Product safed as draft");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to upload product";
          toast.error(message);
        } finally {
          setIsLoading(false);
          setIsLoadingDraft(false);
          setUploadProgress(0);
        }
      },
      [formData, imageFiles, validatePublish, resetDirtyState, router],
    );

  /**
   * Render current step
   */
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            formData={formData}
            errors={errors}
            onFormDataChange={handleFormDataChange}
            onNext={handleNextStep}
            isLoading={isLoading}
            isLoadingDraft={isLoadingDraft}
            onSaveDraft={() => handlePublish("draft")}
          />
        );
      case 1:
        return (
          <PricingInventoryStep
            formData={formData}
            errors={errors}
            onFormDataChange={handleFormDataChange}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            isLoading={isLoading}
            isLoadingDraft={isLoadingDraft}
            onSaveDraft={() => handlePublish("draft")}
          />
        );
      case 2:
        return (
          <CategoryAudienceStep
            formData={formData}
            errors={errors}
            onFormDataChange={handleFormDataChange}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            isLoading={isLoading}
            isLoadingDraft={isLoadingDraft}
            onSaveDraft={() => handlePublish("draft")}
          />
        );
      case 3:
        return (
          <ProductImagesStep
            imageFiles={imageFiles}
            imagePreviews={imagePreviews}
            dragActive={dragActive}
            errors={errors}
            onImageFilesChange={setImageFiles}
            onImagePreviewsChange={setImagePreviews}
            onDragActiveChange={setDragActive}
            onRemoveImage={removeImage}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            isLoading={isLoading}
            isLoadingDraft={isLoadingDraft}
            onSaveDraft={() => handlePublish("draft")}
          />
        );
      case 4:
        return (
          <ReviewPublishStep
            formData={formData}
            imageFiles={imageFiles}
            errors={errors}
            uploadProgress={uploadProgress}
            isLoading={isLoading}
            isLoadingDraft={isLoadingDraft}
            draftProductId={draftProductId}
            onFormDataChange={handleFormDataChange}
            onPublish={() => handlePublish("publish")}
            onSaveDraft={() => handlePublish("draft")}
            onPrevious={handlePreviousStep}
            storeId={storeId}
          />
        );
      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen">
      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes in your product form. Would you like to
              save them as a draft before leaving?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogAction("cancel")}
              className="sm:flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogAction("leave")}
              className="sm:flex-1"
            >
              Leave Without Saving
            </Button>
            <Button
              type="button"
              onClick={() => handleDialogAction("save")}
              disabled={isSavingBeforeLeave}
              className="sm:flex-1 bg-[#14a800] hover:bg-[#14a800]/90"
            >
              {isSavingBeforeLeave ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Container */}
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Add New Product
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Create and upload your product for marketplace approval
                </p>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <WizardProgressIndicator
            currentStep={currentStep}
            totalSteps={5}
            stepProgress={stepProgress}
          />
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">{renderCurrentStep()}</div>
      </div>
    </div>
  );
}

ProductUploadWizard.displayName = "ProductUploadWizard";
