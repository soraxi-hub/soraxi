"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { scrollToTop } from "@/lib/utils";
import { useImageUpload } from "@/hooks/use-image-upload";
import { useWizardNavigation } from "@/hooks/use-wizard-navigation.upload";
import { useWaitlistStepValidation } from "@/hooks/use-waitlist-step-validation";
import { WaitlistProgressIndicator } from "./waitlist-progress-indicator";
import { BusinessContactStep } from "./steps/business-contact-step";
import { BusinessProofStep } from "./steps/business-proof-step";
import { SubmitSuccess } from "./steps/submit-success";
import {
  initialWaitlistFormData,
  type WaitlistApplicantDefaults,
  type WaitlistFormData,
} from "@/types/waitlist-wizard.types";
import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";
import { normalizeInstagramHandle } from "@/lib/utils/normalize-instagram-handle";
import Link from "next/link";

const TOTAL_STEPS = 2;

interface VendorWaitlistWizardProps {
  applicantDefaults: WaitlistApplicantDefaults;
}

/**
 * VendorWaitlistWizard
 *
 * 2-step wizard for vendors to apply to the Soraxi waitlist.
 *
 * Step 1 — Business, contact info, category & business model
 * Step 2 — Business Proof & Product Samples
 *
 * On success, shows a confirmation screen with the vendor's referenceId.
 */
export function VendorWaitlistWizard({
  applicantDefaults,
}: VendorWaitlistWizardProps) {
  const [formData, setFormData] = useState<WaitlistFormData>(() => ({
    ...initialWaitlistFormData,
    ...applicantDefaults,
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    referenceId: string;
    email: string;
  } | null>(null);
  const {
    files: productSampleFiles,
    previews: productSamplePreviews,
    dragActive,
    isProcessing: isProcessingSamples,
    handleImageChange: handleSampleChange,
    handleDrop,
    handleDrag,
    removeImage: removeSample,
  } = useImageUpload();

  const { errors, validateStep, clearFieldError } = useWaitlistStepValidation();

  const { currentStep, nextStep, previousStep, stepProgress } =
    useWizardNavigation(0, TOTAL_STEPS);

  /**
   * Which contact fields actually arrived from the account. Derived from the
   * defaults rather than the live form values, so the notice doesn't disappear
   * the moment the vendor edits one of them.
   */
  const prefilledFields = useMemo(
    () =>
      (
        Object.keys(applicantDefaults) as Array<keyof WaitlistApplicantDefaults>
      ).filter((field) => Boolean(applicantDefaults[field])),
    [applicantDefaults],
  );

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
    if (formData.cacNumber) payload.append("cacNumber", formData.cacNumber);
    const normalizedHandle = normalizeInstagramHandle(formData.instagramHandle);
    if (normalizedHandle) payload.append("instagramHandle", normalizedHandle);
    if (formData.otherProofUrl)
      payload.append("otherProofUrl", formData.otherProofUrl);

    // Category & business model
    payload.append("categoryId", formData.categoryId);
    payload.append("isDropshipper", String(formData.isDropshipper));

    // Append product sample images (as files)
    productSampleFiles.forEach((file) => {
      payload.append("productSamples", file);
    });

    return payload;
  };

  // ─── Submit (single POST with FormData) ──────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Final validation on the proof step
    const validation = validateStep(1, formData, productSampleFiles);
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
            prefilledFields={prefilledFields}
          />
        );
      case 1:
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
            isProcessingSamples={isProcessingSamples}
            onSampleChange={handleSampleChange}
            onDrop={handleDrop}
            onDrag={handleDrag}
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
