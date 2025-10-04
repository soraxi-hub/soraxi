"use client";

import type React from "react";

import { useState, useEffect, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  SaveIcon,
  Upload,
  X,
} from "lucide-react";
import "react-quill-new/dist/quill.snow.css";
import { uploadImagesToCloudinary } from "@/lib/utils/cloudinary-upload";
import { categories, getSubcategoryNames, slugify } from "@/constants/constant";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";
import {
  productCategory,
  productDescription,
  productName,
  productPrice,
  productQuantity,
  productSpecifications,
  productStorePassword,
  productSubCategory,
  ProductTypeEnum,
} from "@/validators/product-validators";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MIN_IMAGE_NUMBER = 3;
const MAX_IMAGE_NUMBER = 5;

interface ProductUploadFormProps {
  storeId: string;
}

interface ProductFormData {
  name: string;
  description: string;
  specifications: string;
  price: number;
  productQuantity: number;
  category: string[];
  subCategory: string[];
  storePassword: string;
  productType: string;
}

// Initial form state for comparison
const initialFormData: ProductFormData = {
  name: "",
  description: "",
  specifications: "",
  price: 0,
  productQuantity: 0,
  category: [],
  subCategory: [],
  storePassword: "",
  productType: ProductTypeEnum.Product,
};

export function ProductUploadForm({ storeId }: ProductUploadFormProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const router = useRouter();
  const [resError, setError] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [draftProductId, setDraftProductId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    specifications: "",
    price: 0,
    productQuantity: 0,
    category: [],
    subCategory: [],
    storePassword: "",
    productType: ProductTypeEnum.Product,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductFormData, string>>
  >({});

  const {
    // isDirty,
    showDialog: showUnsavedDialog,
    isSaving: isSavingBeforeLeave,
    setShowDialog: setShowUnsavedDialog,
    // confirmNavigation,
    handleDialogAction,
    resetDirtyState,
  } = useUnsavedChanges({
    initialData: initialFormData,
    currentData: formData,
    additionalDirtyCheck: imageFiles.length > 0,
    onSaveBeforeLeave: async () => {
      if (!validateForm("draft")) {
        toast.error("Cannot save draft: Please fix validation errors");
        return false;
      }

      try {
        setUploadProgress(30);

        const imageUrls = await uploadImagesToCloudinary(imageFiles);

        const productData = {
          ...formData,
          storeId,
          images: imageUrls,
          category:
            formData.category.length > 0 ? slugify(formData.category) : [],
          subCategory:
            formData.subCategory.length > 0
              ? slugify(formData.subCategory)
              : [],
          submitAction: "draft" as const,
          submittedDraftProductId: draftProductId,
        };

        setUploadProgress(80);

        const response = await fetch(`/api/store/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        setUploadProgress(100);

        if (!response.ok) {
          const { message } = await parseErrorFromResponse(response);
          toast.error(`Failed to save draft: ${message}`);
          return false;
        }

        const { data: resData, message } = await response.json();
        setDraftProductId(resData?.productId);

        toast.success(message || "Your product has been saved as draft.");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save draft"
        );
        return false;
      } finally {
        setUploadProgress(0);
      }
    },
  });

  // ============================================================================
  // RICH TEXT EDITOR CONFIGURATION
  // ============================================================================

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }, { background: [] }],
      ["link"],
      ["clean"],
    ],
  };

  const quillFormats = [
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

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const handleInputChange = (
    field: keyof ProductFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    action: "draft" | "publish"
  ) => {
    e.preventDefault();

    if (!validateForm(action)) {
      return;
    }

    try {
      setError(null);
      setUploadProgress(10);

      const prepareProductData = async () => {
        const imageUrls = await uploadImagesToCloudinary(imageFiles);

        return {
          ...formData,
          storeId,
          images: imageUrls,
          category:
            formData.category.length > 0 ? slugify(formData.category) : [],
          subCategory:
            formData.subCategory.length > 0
              ? slugify(formData.subCategory)
              : [],
          submitAction: action,
          submittedDraftProductId: draftProductId,
        };
      };

      if (action === "draft") {
        setIsLoadingDraft(true);
        setUploadProgress(30);
        const productData = await prepareProductData();
        setUploadProgress(80);

        const response = await fetch(`/api/store/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        setUploadProgress(100);

        if (!response.ok) {
          const { message } = await parseErrorFromResponse(response);
          toast.error(`Failed to save draft: ${message}`);
          setError([message]);
          return;
        }

        const { data: resData, message } = await response.json();
        setDraftProductId(resData?.productId);

        toast.success(message || "Your product has been saved as draft.");
        resetDirtyState();
      } else if (action === "publish") {
        setIsLoading(true);
        setUploadProgress(30);
        const productData = await prepareProductData();
        setUploadProgress(80);

        const response = await fetch(`/api/store/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        setUploadProgress(100);

        if (!response.ok) {
          const { message } = await parseErrorFromResponse(response);
          toast.error(`Failed to publish: ${message}`);
          setError([message]);
          return;
        }

        toast.success("Your product has been uploaded and is pending review.");
        resetDirtyState();

        // Reset form after publish
        setFormData({
          name: "",
          description: "",
          specifications: "",
          price: 0,
          productQuantity: 0,
          category: [],
          subCategory: [],
          storePassword: "",
          productType: "product",
        });
        setSelectedCategory("");
        setSelectedSubCategory("");
        setImageFiles([]);
        setImagePreviews([]);
        router.back();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload product"
      );
      setError(["Failed to upload product"]);
    } finally {
      setIsLoading(false);
      setIsLoadingDraft(false);
      setUploadProgress(0);
    }
  };

  // ============================================================================
  // IMAGE UPLOAD HANDLERS
  // ============================================================================

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files);

    if (fileArray.length > MAX_IMAGE_NUMBER) {
      toast.error(`You can only upload up to ${MAX_IMAGE_NUMBER} images`);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPEG, PNG, and WebP images are allowed");
        return;
      }
      if (file.size > maxSize) {
        toast.error("Each image must be less than 5MB");
        return;
      }
    }

    setImageFiles(fileArray);

    const previews = fileArray.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    URL.revokeObjectURL(imagePreviews[index]);

    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  // ============================================================================
  // CATEGORY HANDLERS
  // ============================================================================

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedSubCategory("");
    setFormData((prev) => ({
      ...prev,
      category: [value],
      subCategory: [],
    }));
  };

  const handleSubCategoryChange = (value: string) => {
    setSelectedSubCategory(value);
    setFormData((prev) => ({
      ...prev,
      subCategory: [value],
    }));
  };

  // ============================================================================
  // VALIDATION FUNCTION
  // ============================================================================

  const validateForm = (action: "draft" | "publish"): boolean => {
    const newErrors: Partial<Record<keyof ProductFormData, string>> & {
      images?: string;
    } = {};

    // Helper function to get first error message
    const getFirstError = (result: any) =>
      result.error?.errors[0]?.message || "Validation failed";

    // Validate all fields that have values (for both draft and publish)
    const nameResult = productName.safeParse(formData.name);
    if (!nameResult.success) {
      newErrors.name = getFirstError(nameResult);
    }

    if (!formData.storePassword) {
      newErrors.storePassword =
        "Authorization required: Please enter your store password";
    } else if (formData.storePassword.length < 4) {
      newErrors.storePassword = "Please enter a valid store password";
    }

    if (formData.description && formData.description !== "") {
      const descriptionResult = productDescription.safeParse(
        formData.description
      );
      if (!descriptionResult.success) {
        newErrors.description = getFirstError(descriptionResult);
      }
    }

    if (formData.specifications && formData.specifications !== "") {
      const specificationsResult = productSpecifications.safeParse(
        formData.specifications
      );
      if (!specificationsResult.success) {
        newErrors.specifications = getFirstError(specificationsResult);
      }
    }

    if (formData.price !== undefined && formData.price !== 0) {
      const priceResult = productPrice.safeParse(formData.price);
      if (!priceResult.success) {
        newErrors.price = getFirstError(priceResult);
      }
    }

    if (
      formData.productQuantity !== undefined &&
      formData.productQuantity !== 0
    ) {
      const quantityResult = productQuantity.safeParse(
        formData.productQuantity
      );
      if (!quantityResult.success) {
        newErrors.productQuantity = getFirstError(quantityResult);
      }
    }

    if (formData.category.length > 0) {
      const categoryResult = productCategory.safeParse(formData.category);
      if (!categoryResult.success) {
        newErrors.category = getFirstError(categoryResult);
      }
    }

    if (formData.subCategory.length > 0) {
      const subCategoryResult = productSubCategory.safeParse(
        formData.subCategory
      );
      if (!subCategoryResult.success) {
        newErrors.subCategory = getFirstError(subCategoryResult);
      }
    }

    // Publish-specific validations - all fields are required and must pass validation
    if (action === "publish") {
      // Required fields validation (all fields must be present and valid)
      const requiredValidations = {
        name: productName.safeParse(formData.name),
        description: productDescription.safeParse(formData.description),
        specifications: productSpecifications.safeParse(
          formData.specifications
        ),
        price: productPrice.safeParse(formData.price),
        productQuantity: productQuantity.safeParse(formData.productQuantity),
        category: productCategory.safeParse(formData.category),
        subCategory: productSubCategory.safeParse(formData.subCategory),
        storePassword: productStorePassword.safeParse(formData.storePassword),
      };

      // Check if any required field is missing
      if (!formData.name) newErrors.name = "Product name is required";
      if (!formData.description)
        newErrors.description = "Product description is required";
      if (!formData.specifications)
        newErrors.specifications = "Product specifications are required";
      if (!formData.price) newErrors.price = "Price is required";
      if (formData.productQuantity === undefined)
        newErrors.productQuantity = "Quantity is required";
      if (formData.category.length === 0)
        newErrors.category = "Category is required";
      if (formData.subCategory.length === 0)
        newErrors.subCategory = "Subcategory is required";
      if (!formData.storePassword)
        newErrors.storePassword = "Store password is required";

      // Override with validation errors if fields exist but are invalid
      if (!newErrors.name && !requiredValidations.name.success) {
        newErrors.name = getFirstError(requiredValidations.name);
      }
      if (!newErrors.description && !requiredValidations.description.success) {
        newErrors.description = getFirstError(requiredValidations.description);
      }
      if (
        !newErrors.specifications &&
        !requiredValidations.specifications.success
      ) {
        newErrors.specifications = getFirstError(
          requiredValidations.specifications
        );
      }
      if (!newErrors.price && !requiredValidations.price.success) {
        newErrors.price = getFirstError(requiredValidations.price);
      }
      if (
        !newErrors.productQuantity &&
        !requiredValidations.productQuantity.success
      ) {
        newErrors.productQuantity = getFirstError(
          requiredValidations.productQuantity
        );
      }
      if (!newErrors.category && !requiredValidations.category.success) {
        newErrors.category = getFirstError(requiredValidations.category);
      }
      if (!newErrors.subCategory && !requiredValidations.subCategory.success) {
        newErrors.subCategory = getFirstError(requiredValidations.subCategory);
      }
      if (
        !newErrors.storePassword &&
        !requiredValidations.storePassword.success
      ) {
        newErrors.storePassword = getFirstError(
          requiredValidations.storePassword
        );
      }

      // Image validation for publish
      if (imageFiles.length < MIN_IMAGE_NUMBER) {
        newErrors.images = `Please select at least ${MIN_IMAGE_NUMBER} product images`;
        toast.error(
          `Please select at least ${MIN_IMAGE_NUMBER} product images`
        );
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // CLEANUP EFFECTS
  // ============================================================================

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const getValidationIcon = (fieldName: keyof ProductFormData) => {
    if (errors[fieldName]) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (formData[fieldName] && !errors[fieldName]) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  // ============================================================================
  // RENDER COMPONENT
  // ============================================================================

  return (
    <div className="min-h-screen">
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

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#14a800]/10 rounded-lg"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Add New Product
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Create and upload your product for marketplace approval
                </p>
              </div>
            </div>

            {/* Desktop Submit Buttons */}
            <div className="hidden md:flex gap-2 justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={isLoadingDraft}
                onClick={(e) => {
                  handleSubmit(
                    e as unknown as React.FormEvent<HTMLFormElement>,
                    "draft"
                  );
                }}
              >
                {isLoadingDraft ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Draft...
                  </>
                ) : (
                  <>
                    <SaveIcon className="ml-2 h-4 w-4" />
                    Save as Draft
                  </>
                )}
              </Button>

              <Button
                type="button"
                className="bg-[#14a800] hover:bg-[#14a800]/90 text-white px-6 py-2"
                disabled={isLoading}
                onClick={(e) => {
                  handleSubmit(
                    e as unknown as React.FormEvent<HTMLFormElement>,
                    "publish"
                  );
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Upload Product
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          {(isLoading || isSavingBeforeLeave) && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isSavingBeforeLeave
                    ? "Saving Draft..."
                    : "Uploading Product..."}
                </span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <Progress
                value={uploadProgress}
                indicatorClassName="bg-soraxi-green"
                className="h-2"
              />
            </div>
          )}
        </div>

        {/* Main Form */}

        <form
          id="product-upload-form"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {resError && (
              <Alert
                variant="destructive"
                className="mb-6 dark:bg-muted/50 border-red-500/15"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Issues</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">
                    Please resolve the following issues before proceeding:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    {(resError ?? []).map((error, index) => (
                      <li key={index} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Product Information Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-xl">Product Information</CardTitle>
                </div>
                <CardDescription>
                  Provide detailed information about your product. All fields
                  are required for approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Name */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor="product-name"
                      className="text-sm font-medium"
                    >
                      Product Name *
                    </Label>
                    {getValidationIcon("name")}
                  </div>
                  <Input
                    id="product-name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter a descriptive product name"
                    className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {formData.name.length}/100 characters
                  </p>
                </div>

                <Separator />

                {/* Product Description */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">
                      Product Description
                    </Label>
                    {getValidationIcon("description")}
                  </div>
                  <div className="overflow-hidden h-70">
                    <ReactQuill
                      value={formData.description}
                      onChange={(value) =>
                        handleInputChange("description", value)
                      }
                      modules={quillModules}
                      formats={quillFormats}
                      className="h-56"
                    />
                  </div>
                  {errors.description && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.description}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Product Specifications */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">
                      Product Specifications
                    </Label>
                    {getValidationIcon("specifications")}
                  </div>
                  <div className="overflow-hidden h-70">
                    <ReactQuill
                      value={formData.specifications}
                      onChange={(value) =>
                        handleInputChange("specifications", value)
                      }
                      modules={quillModules}
                      formats={quillFormats}
                      className="h-56"
                    />
                  </div>
                  {errors.specifications && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.specifications}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-xl">Pricing & Inventory</CardTitle>
                </div>
                <CardDescription>
                  Set your product price and manage inventory levels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Price */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor="product-price"
                        className="text-sm font-medium"
                      >
                        Price (₦)
                      </Label>
                      {getValidationIcon("price")}
                    </div>
                    <Input
                      id="product-price"
                      value={
                        formData.price === 0 ? "" : formData.price.toString()
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        // Only convert to number if not empty
                        handleInputChange(
                          "price",
                          value === "" ? 0 : Number(value)
                        );
                      }}
                      type="number"
                      min="0"
                      step="500"
                      placeholder="500"
                      className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
                    />
                    {errors.price && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.price}
                      </p>
                    )}
                    {formData.price > 0 && (
                      <p className="text-xs text-green-600">
                        ₦
                        {formData.price.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label
                        htmlFor="product-quantity"
                        className="text-sm font-medium"
                      >
                        Quantity
                      </Label>
                      {getValidationIcon("productQuantity")}
                    </div>
                    <Input
                      id="product-quantity"
                      value={
                        formData.productQuantity === 0
                          ? ""
                          : formData.productQuantity.toString()
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        handleInputChange(
                          "productQuantity",
                          value === "" ? 0 : Number(value)
                        );
                      }}
                      type="number"
                      min="0"
                      placeholder="0"
                      className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
                    />
                    {errors.productQuantity && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.productQuantity}
                      </p>
                    )}
                    {formData.productQuantity > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {formData.productQuantity} units in stock
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Category Selection Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg">Category</CardTitle>
                </div>
                <CardDescription>
                  Choose the most appropriate category for your product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Category */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">Main Category</Label>
                    {getValidationIcon("category")}
                  </div>
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800] w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.slug} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.category}
                    </p>
                  )}
                </div>

                {/* Subcategory */}
                {selectedCategory && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm font-medium">Subcategory</Label>
                      {getValidationIcon("subCategory")}
                    </div>
                    <Select
                      value={selectedSubCategory}
                      onValueChange={handleSubCategoryChange}
                    >
                      <SelectTrigger className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800] w-full">
                        <SelectValue placeholder="Select a subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSubcategoryNames(selectedCategory).map(
                          (subCategory) => (
                            <SelectItem key={subCategory} value={subCategory}>
                              {subCategory}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {errors.subCategory && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.subCategory}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Image Upload Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg">Product Images</CardTitle>
                </div>
                <CardDescription>
                  Upload up to {MAX_IMAGE_NUMBER} high-quality images of your
                  product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Area */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                    dragActive
                      ? "border-[#14a800] bg-[#14a800]/5"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Drop images here or click to upload
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, WEBP up to 5MB each
                      </p>
                    </div>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {imagePreviews.map((src, index) => (
                      <div key={index} className="relative group">
                        <Image
                          src={src || "/placeholder.svg"}
                          alt={`Product preview ${index + 1}`}
                          width={150}
                          height={150}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Status */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {imageFiles.length}/{MAX_IMAGE_NUMBER} images uploaded
                  </span>
                  {imageFiles.length > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[#14a800] border-[#14a800]"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg">Security</CardTitle>
                </div>
                <CardDescription>
                  Verify your identity with your store password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor="store-password"
                      className="text-sm font-medium"
                    >
                      Store Password *
                    </Label>
                    {getValidationIcon("storePassword")}
                  </div>
                  <Input
                    id="store-password"
                    value={formData.storePassword}
                    onChange={(e) =>
                      handleInputChange("storePassword", e.target.value)
                    }
                    type="password"
                    placeholder="Enter your store password"
                    className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
                  />
                  {errors.storePassword && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.storePassword}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>

        {/* Mobile Submit Buttons */}
        <div className="md:hidden mt-8 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full bg-transparent"
            disabled={isLoadingDraft}
            onClick={(e) => {
              handleSubmit(
                e as unknown as React.FormEvent<HTMLFormElement>,
                "draft"
              );
            }}
          >
            {isLoadingDraft ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Draft...
              </>
            ) : (
              <>
                <SaveIcon className="mr-2 h-4 w-4" />
                Save as Draft
              </>
            )}
          </Button>

          <Button
            type="button"
            className="w-full bg-[#14a800] hover:bg-[#14a800]/90 text-white h-12"
            disabled={isLoading}
            onClick={(e) => {
              handleSubmit(
                e as unknown as React.FormEvent<HTMLFormElement>,
                "publish"
              );
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading Product...
              </>
            ) : (
              <>
                Upload Product
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
