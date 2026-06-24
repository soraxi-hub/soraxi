import type { ProductFormData } from "@/validators/product-validators";

// ============================================================================
// RICH TEXT EDITOR CONFIGURATION
// ============================================================================

export const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    // [{ color: [] }, { background: [] }],
    // ["link"],
    ["clean"],
  ],
};

export const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "color",
  "background",
  "link",
];

/**
 * Wizard Step Identifiers
 * Defines all available steps in the product upload wizard
 */
export enum WizardStep {
  BasicInfo = 0,
  PricingInventory = 1,
  CategoryAudience = 2,
  ProductImages = 3,
  ReviewPublish = 4,
}

/**
 * Wizard Step Configuration
 * Metadata for each step
 */
export interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

/**
 * Wizard State
 * Complete state shape for the product upload wizard
 */
export interface WizardState {
  // Form data
  formData: ProductFormData;

  // Validation
  errors: Partial<Record<keyof ProductFormData, string>>;

  // Images
  imageFiles: File[];
  imagePreviews: string[];

  // Navigation
  currentStep: WizardStep;

  // Upload progress
  uploadProgress: number;

  // Draft management
  draftProductId: string | null;

  // Loading states
  isLoading: boolean;
  isLoadingDraft: boolean;

  // Unsaved changes
  isDirty: boolean;

  // UI
  dragActive: boolean;
}

/**
 * Step Validation Result
 * Result of validating a single step
 */
export interface StepValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof ProductFormData, string>>;
}

/**
 * Basic Info Step Props
 */
export interface BasicInfoStepProps {
  formData: ProductFormData;
  errors: Partial<Record<keyof ProductFormData, string>>;
  onFormDataChange: (
    field: keyof ProductFormData,
    value: string | number,
  ) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => void;
  isLoadingDraft: boolean;
  isLoading?: boolean;
  onGenerateDescription: () => Promise<void>;
  isGeneratingDescription: boolean;
}

/**
 * Pricing & Inventory Step Props
 */
export interface PricingInventoryStepProps {
  formData: ProductFormData;
  errors: Partial<Record<keyof ProductFormData, string>>;
  onFormDataChange: (
    field: keyof ProductFormData,
    value: string | number,
  ) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => void;
  isLoadingDraft: boolean;
  isLoading?: boolean;
}

/**
 * Category & Audience Step Props
 */
export interface CategoryAudienceStepProps {
  formData: ProductFormData;
  errors: Partial<Record<keyof ProductFormData, string>>;
  onFormDataChange: (
    field: keyof ProductFormData,
    value: string | number | string[],
  ) => void;
  onNext: () => void;
  onSaveDraft: () => void;
  isLoadingDraft: boolean;
  isLoading?: boolean;
}

/**
 * Product Images Step Props
 */
export interface ProductImagesStepProps {
  imageFiles: File[];
  imagePreviews: string[];
  dragActive: boolean;
  errors: Partial<Record<keyof ProductFormData, string>>;
  onImageFilesChange: (files: File[]) => void;
  onImagePreviewsChange: (previews: string[]) => void;
  onDragActiveChange: (active: boolean) => void;
  onRemoveImage: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSaveDraft: () => void;
  isLoadingDraft: boolean;
  isLoading?: boolean;
}

/**
 * Review & Publish Step Props
 */
export interface ReviewPublishStepProps {
  formData: ProductFormData;
  imageFiles: File[];
  errors: Partial<Record<keyof ProductFormData, string>>;
  uploadProgress: number;
  isLoading: boolean;
  isLoadingDraft: boolean;
  draftProductId: string | null;
  onFormDataChange: (
    field: keyof ProductFormData,
    value: string | number,
  ) => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onPrevious: () => void;
  storeId: string;
}

/**
 * Wizard Container Props
 */
export interface ProductUploadWizardProps {
  storeId: string;
}

/**
 * Image File Validation Options
 */
export interface ImageValidationOptions {
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
}

/**
 * Wizard Navigation Options
 */
export interface WizardNavigationOptions {
  validateBeforeNext?: boolean;
  allowSkip?: boolean;
  onBeforeNext?: () => Promise<boolean> | boolean;
  onBeforePrevious?: () => Promise<boolean> | boolean;
}

/**
 * Step Component Type
 */
export type StepComponent = React.ComponentType<any>;

/**
 * Draft Save Result
 */
export interface DraftSaveResult {
  success: boolean;
  productId?: string;
  message: string;
  errors?: Partial<Record<keyof ProductFormData, string>>;
}

/**
 * Product Upload Result
 */
export interface ProductUploadResult {
  success: boolean;
  productId?: string;
  message: string;
  errors?: Partial<Record<keyof ProductFormData, string>>;
}
