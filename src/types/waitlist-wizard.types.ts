import type { InventorySize } from "@/domain/vendor-application";

// ─── Form data ────────────────────────────────────────────────────────────────

export interface WaitlistFormData {
  // Step 1 — Business & Contact
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;

  // Step 2 — Category & Model
  categoryId: string;
  categoryName: string; // display only, not submitted
  subCategory: string;
  estimatedInventorySize: InventorySize | "";
  estimatedPriceMin: number;
  estimatedPriceMax: number;
  isDropshipper: boolean | null;

  // Step 3 — Business Proof
  cacNumber: string;
  instagramHandle: string;
  otherProofUrl: string;
}

export const initialWaitlistFormData: WaitlistFormData = {
  businessName: "",
  ownerName: "",
  email: "",
  phone: "",
  categoryId: "",
  categoryName: "",
  subCategory: "",
  estimatedInventorySize: "",
  estimatedPriceMin: 0,
  estimatedPriceMax: 0,
  isDropshipper: null,
  cacNumber: "",
  instagramHandle: "",
  otherProofUrl: "",
};

// ─── Validation ───────────────────────────────────────────────────────────────

export type WaitlistFormErrors = Partial<
  Record<keyof WaitlistFormData | "productSamples", string>
>;

export interface WaitlistStepValidationResult {
  isValid: boolean;
  errors: WaitlistFormErrors;
}

// ─── Step props ───────────────────────────────────────────────────────────────

export interface BaseStepProps {
  formData: WaitlistFormData;
  errors: WaitlistFormErrors;
  onFormDataChange: (
    field: keyof WaitlistFormData,
    value: string | number | boolean | null,
  ) => void;
  isLoading: boolean;
}

export interface StepWithNavProps extends BaseStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

export interface FirstStepProps extends BaseStepProps {
  onNext: () => void;
}

export interface ProofStepProps extends BaseStepProps {
  onPrevious: () => void;
  onSubmit: () => void;
  productSampleFiles: File[];
  productSamplePreviews: string[];
  dragActive: boolean;
  onProductSampleFilesChange: (files: File[]) => void;
  onProductSamplePreviewsChange: (previews: string[]) => void;
  onDragActiveChange: (active: boolean) => void;
  onRemoveSample: (index: number) => void;
}

// ─── Wizard props ─────────────────────────────────────────────────────────────

export interface WaitlistWizardStep {
  title: string;
  description: string;
}

export type WizardStepIndex = 0 | 1 | 2 | 3;

// ─── Image validation (reused from upload wizard) ─────────────────────────────

export interface ImageValidationOptions {
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
}
