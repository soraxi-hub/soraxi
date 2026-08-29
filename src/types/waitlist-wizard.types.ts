export interface WaitlistFormData {
  // Step 1 — Business, contact & what you sell
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  institution: string;
  categoryId: string;
  isDropshipper: boolean | null;

  // Step 2 — Business Proof
  cacNumber: string;
  instagramHandle: string;
  otherProofUrl: string;
}

export const initialWaitlistFormData: WaitlistFormData = {
  businessName: "",
  ownerName: "",
  email: "",
  phone: "",
  institution: "",
  categoryId: "",
  isDropshipper: null,
  cacNumber: "",
  instagramHandle: "",
  otherProofUrl: "",
};

export interface WaitlistApplicantDefaults {
  ownerName: string;
  email: string;
  phone: string;
  institution: string;
}

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

export interface FirstStepProps extends BaseStepProps {
  onNext: () => void;
  /** Which fields arrived prefilled, so the step can say so once. */
  prefilledFields: Array<keyof WaitlistFormData>;
}

export interface ProofStepProps extends BaseStepProps {
  onPrevious: () => void;
  onSubmit: () => void;
  productSampleFiles: File[];
  productSamplePreviews: string[];
  dragActive: boolean;
  /** True while samples are being compressed. */
  isProcessingSamples?: boolean;
  onSampleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: React.DragEvent) => void;
  onDrag: (event: React.DragEvent) => void;
  onRemoveSample: (index: number) => void;
}

// ─── Wizard props ─────────────────────────────────────────────────────────────

export interface WaitlistWizardStep {
  title: string;
  description: string;
}

export type WizardStepIndex = 0 | 1;

// ─── Image validation (reused from upload wizard) ─────────────────────────────

export interface ImageValidationOptions {
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
}
