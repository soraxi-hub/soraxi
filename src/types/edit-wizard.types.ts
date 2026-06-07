import { ProductStatusEnum, ProductTypeEnum } from "@/enums";
import { Size } from "@/lib/db/models/product.model";

export type ProductData = {
  id: string;
  name: string;
  price: number | undefined;
  sizes: Size[] | undefined;
  productQuantity: number | undefined;
  images: string[] | undefined;
  category: string[] | undefined;
  subCategory: string[] | undefined;
  targetAudience: string[] | undefined;
  description: string | undefined;
  specifications: string | undefined;
  status: ProductStatusEnum;
  productType: ProductTypeEnum;
  createdAt: Date;
  slug: string;
  isVerifiedProduct: boolean;
  isVisible: boolean;
  rating: number | undefined;
  firstApprovedAt: Date | undefined;
};

/**
 * Form data for product editing
 * Mirrors ProductData but with storePassword for security
 */
export type EditProductFormData = Pick<
  ProductData,
  | "name"
  | "category"
  | "description"
  | "specifications"
  | "price"
  | "productQuantity"
  | "subCategory"
  | "targetAudience"
  | "images"
  | "status"
  | "id"
  | "firstApprovedAt"
  | "productType"
> & {
  storePassword: string;
};

export type TrackableProductFields = Exclude<
  keyof EditProductFormData,
  "id" | "storePassword"
>;

/**
 * Changes tracked from initial state
 * Used for intelligent API calls (only send changed fields)
 */
export type ProductChanges = Partial<Record<TrackableProductFields, boolean>>;

/**
 * Image handling for edit scenario
 * Tracks existing URLs and new files separately
 */
export interface EditProductImages {
  existingUrls: string[];
  newFiles: File[];
  previewUrls: string[];
}

/**
 * Step definitions for edit wizard
 */
export enum EditWizardStep {
  BasicInfo = 0,
  PricingInventory = 1,
  CategoryAudience = 2,
  ProductImages = 3,
  ReviewPublish = 4,
}

export const EDIT_WIZARD_STEPS = [
  { id: EditWizardStep.BasicInfo, label: "Basic Info", icon: "FileText" },
  {
    id: EditWizardStep.PricingInventory,
    label: "Pricing & Inventory",
    icon: "ShoppingCart",
  },
  {
    id: EditWizardStep.CategoryAudience,
    label: "Category & Audience",
    icon: "Tag",
  },
  { id: EditWizardStep.ProductImages, label: "Images", icon: "Image" },
  {
    id: EditWizardStep.ReviewPublish,
    label: "Review & Publish",
    icon: "CheckCircle",
  },
];

export const TOTAL_EDIT_WIZARD_STEPS = EDIT_WIZARD_STEPS.length;

/**
 * Props for ProductEditWizard component
 */
export interface ProductEditWizardProps {
  storeId: string;
  productId: string;
  initialProductData: ProductData;
}

/**
 * Validation result structure
 */
export interface StepValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof EditProductFormData, string>>;
}

/**
 * API Request payload for PUT /api/store/products/{id}
 */
export interface EditProductPayload extends FormData {
  // FormData can't have strong typing, but includes:
  // - name?, description?, specifications?
  // - price?, productQuantity?
  // - category[], subCategory[], targetAudience[]
  // - images[] (new files)
  // - oldImageURLs[] (existing URLs to keep)
  // - storePassword
  // - submitAction: 'draft' | 'publish'
  // - storeId
}

/**
 * API Response from PUT /api/store/products/{id}
 */
export interface EditProductResponse {
  message: string;
  product: ProductData;
}

/**
 * Hook return types
 */
export interface UseWizardNavigationReturn {
  currentStep: EditWizardStep;
  nextStep: (validate?: boolean) => Promise<boolean>;
  previousStep: () => Promise<boolean>;
  goToStep: (step: EditWizardStep | number) => Promise<boolean>;
  canGoNext: () => boolean;
  canGoPrevious: () => boolean;
  stepProgress: number;
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
  setCurrentStep: (step: EditWizardStep | number) => void;
  getErrorStep: (value: keyof EditProductFormData) => number;
}

export interface UseStepValidationReturn {
  errors: Partial<Record<keyof EditProductFormData, string>>;
  validateStep: (
    step: EditWizardStep,
    formData: EditProductFormData,
    imageFiles: File[],
  ) => StepValidationResult;
  validatePublish: (
    formData: EditProductFormData,
    imageFiles: File[],
    storePassword: string,
  ) => StepValidationResult;
  clearFieldError: (field: keyof EditProductFormData) => void;
  setErrors: (
    errors: Partial<Record<keyof EditProductFormData, string>>,
  ) => void;
  clearErrors: () => void;
}

export interface UseProductImagesReturn {
  imageFiles: File[];
  imagePreviews: string[];
  dragActive: boolean;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDrag: (e: React.DragEvent) => void;
  removeImage: (index: number, isNewFile: boolean) => void;
  setDragActive: (active: boolean) => void;
  setImageFiles: (files: File[]) => void;
  setImagePreviews: (previews: string[]) => void;
}

export interface UseProductChangesReturn {
  changedFields: ProductChanges;
  hasChanges: boolean;
  trackChange: (field: keyof EditProductFormData) => void;
  clearChanges: () => void;
  getChangedFieldsOnly: (
    formData: EditProductFormData,
  ) => Partial<EditProductFormData>;
}
