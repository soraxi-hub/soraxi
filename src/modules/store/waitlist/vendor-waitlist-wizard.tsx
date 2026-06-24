"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { scrollToTop } from "@/lib/utils";
import { useProductImages } from "@/hooks/use-product-images.upload";
import { useWizardNavigation } from "@/hooks/use-wizard-navigation.upload";
import { useWaitlistStepValidation } from "@/hooks/use-waitlist-step-validation";
import { WaitlistProgressIndicator } from "./waitlist-progress-indicator";
import { BusinessContactStep } from "./steps/business-contact-step";
import { CategoryModelStep } from "./steps/category-model-step";
import { BusinessProofStep } from "./steps/business-proof-step";
import { SubmitSuccess } from "./steps/submit-success";
import {
  initialWaitlistFormData,
  type WaitlistFormData,
} from "@/types/waitlist-wizard.types";
import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";
import Link from "next/link";

const TOTAL_STEPS = 3;

/**
 * VendorWaitlistWizard
 *
 * 3-step wizard for vendors to apply to the Soraxi waitlist.
 *
 * Step 1 — Business & Contact Info
 * Step 2 — Category, Inventory & Business Model
 * Step 3 — Business Proof & Product Samples
 *
 * On success, shows a confirmation screen with the vendor's referenceId.
 */
export function VendorWaitlistWizard() {
  const [formData, setFormData] = useState<WaitlistFormData>(
    initialWaitlistFormData,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    referenceId: string;
    email: string;
  } | null>(null);
  const {
    imageFiles: productSampleFiles,
    imagePreviews: productSamplePreviews,
    dragActive,
    removeImage: removeSample,
    setDragActive,
    setImageFiles: setSampleFiles,
    setImagePreviews: setSamplePreviews,
  } = useProductImages({ maxFiles: 4 });

  const { errors, validateStep, clearFieldError } = useWaitlistStepValidation();

  const { currentStep, nextStep, previousStep, stepProgress } =
    useWizardNavigation(0, TOTAL_STEPS);

  // ─── Field change handler ─────────────────────────────────────────────────

  const handleFormDataChange = useCallback(
    (
      field: keyof WaitlistFormData,
      value: string | number | boolean | null,
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      clearFieldError(field);
    },
    [clearFieldError],
  );

  // ─── Step navigation ──────────────────────────────────────────────────────

  const handleNext = useCallback(async () => {
    const validation = validateStep(currentStep, formData, productSampleFiles);
    if (!validation.isValid) {
      toast.error("Please fix the errors before continuing");
      return;
    }
    const success = await nextStep();
    if (success) scrollToTop();
  }, [currentStep, formData, productSampleFiles, validateStep, nextStep]);

  const handlePrevious = useCallback(async () => {
    const success = await previousStep();
    if (success) scrollToTop();
  }, [previousStep]);

  // ─── Prepare FormData for submission (single endpoint) ──────────────────
  const prepareFormData = (): FormData => {
    const payload = new FormData();

    // Business & contact info
    payload.append("businessName", formData.businessName);
    payload.append("ownerName", formData.ownerName);
    payload.append("email", formData.email);
    payload.append("phone", formData.phone);
    payload.append("institution", formData.institution);
    payload.append("stateOfApplicant", formData.stateOfApplicant);
    payload.append("cityOfApplicant", formData.cityOfApplicant);
    if (formData.cacNumber) payload.append("cacNumber", formData.cacNumber);
    if (formData.instagramHandle)
      payload.append("instagramHandle", formData.instagramHandle);
    if (formData.otherProofUrl)
      payload.append("otherProofUrl", formData.otherProofUrl);

    // Category & inventory
    payload.append("categoryId", formData.categoryId);
    if (formData.subCategory)
      payload.append("subCategory", formData.subCategory);
    payload.append(
      "estimatedInventorySize",
      formData.estimatedInventorySize as string,
    );
    payload.append("estimatedPriceMin", String(formData.estimatedPriceMin));
    payload.append("estimatedPriceMax", String(formData.estimatedPriceMax));
    payload.append("isDropshipper", String(formData.isDropshipper));

    // Append product sample images (as files)
    productSampleFiles.forEach((file) => {
      payload.append("productSamples", file);
    });

    return payload;
  };

  // ─── Submit (single POST with FormData) ──────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Final validation on step 3
    const validation = validateStep(2, formData, productSampleFiles);
    if (!validation.isValid) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    if (productSampleFiles.length === 0) {
      toast.error("At least one product sample image is required");
      return;
    }

    try {
      setIsLoading(true);

      const payload = prepareFormData();
      const response = await fetch("/api/waitlist/apply", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const { message } = await parseErrorFromResponse(response);
        throw new Error(message || "Failed to submit application");
      }

      const result = await response.json();
      // Expecting { referenceId: string, email: string } from the backend
      setSubmittedResult({
        referenceId: result.referenceId,
        email: formData.email,
      });

      toast.success("Application submitted successfully!");
      scrollToTop();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit application";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [formData, productSampleFiles, validateStep]);

  // ─── Render current step ──────────────────────────────────────────────────

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <BusinessContactStep
            formData={formData}
            errors={errors}
            onFormDataChange={handleFormDataChange}
            onNext={handleNext}
            isLoading={isLoading}
          />
        );
      case 1:
        return (
          <CategoryModelStep
            formData={formData}
            errors={errors}
            onFormDataChange={handleFormDataChange}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isLoading={isLoading}
          />
        );
      case 2:
        return (
          <BusinessProofStep
            formData={formData}
            errors={errors}
            onFormDataChange={handleFormDataChange}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            productSampleFiles={productSampleFiles}
            productSamplePreviews={productSamplePreviews}
            dragActive={dragActive}
            onProductSampleFilesChange={setSampleFiles}
            onProductSamplePreviewsChange={setSamplePreviews}
            onDragActiveChange={setDragActive}
            onRemoveSample={removeSample}
          />
        );
      default:
        return null;
    }
  };

  // ─── Success screen ───────────────────────────────────────────────────────

  if (submittedResult) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <SubmitSuccess
          referenceId={submittedResult.referenceId}
          email={submittedResult.email}
        />
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Join the Soraxi Waitlist
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Apply to become a vendor on Soraxi. We review every application to
              ensure quality and fair competition across categories.{" "}
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL}/store/waitlist/status`}
                className="hover:text-soraxi-green-hover text-soraxi-green"
              >
                Or view your application status.
              </Link>
            </p>
          </div>

          <WaitlistProgressIndicator
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            stepProgress={stepProgress}
          />
        </div>

        {/* Step content */}
        <div className="max-w-4xl mx-auto">{renderStep()}</div>
      </div>
    </div>
  );
}

VendorWaitlistWizard.displayName = "VendorWaitlistWizard";
