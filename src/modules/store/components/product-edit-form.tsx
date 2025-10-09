"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight,
  Loader2,
  Upload,
  X,
  ImageIcon,
  Package,
  Tag,
  DollarSign,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  SaveIcon,
} from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { uploadImagesToCloudinary } from "@/lib/utils/cloudinary-upload";
import { toast } from "sonner";
import { categories, getSubcategoryNames, slugify } from "@/constants/constant";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";
import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProductStatusEnum } from "@/validators/product-validators";
import { ProductFactory } from "@/domain/products/product-factory";
import { MAX_IMAGE_NUMBER } from "@/domain/products/product-upload";

type Output = inferProcedureOutput<
  AppRouter["storeProducts"]["getStoreProductById"]
>;
type ProductData = Output["product"];

type ProductFormData = Pick<
  ProductData,
  | "name"
  | "category"
  | "description"
  | "firstApprovedAt"
  | "id"
  | "images"
  | "price"
  | "specifications"
  | "subCategory"
  | "status"
  | "productQuantity"
  | "productType"
> & {
  storePassword: string;
};

interface ProductFormProps {
  storeId: string;
  productId: string;
  initialProductData: ProductData;
}

export function ProductEditForm({
  storeId,
  productId,
  initialProductData,
}: ProductFormProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const router = useRouter();
  const [resError, setError] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const categorySlug = initialProductData?.category?.[0];
    if (!categorySlug) return "";

    const category = categories.find((cat) => cat.slug === categorySlug);
    return category?.name || "";
  });

  const [selectedSubCategory, setSelectedSubCategory] = useState(() => {
    const subCategorySlug = initialProductData?.subCategory?.[0];
    const categorySlug = initialProductData?.category?.[0];

    if (!subCategorySlug || !categorySlug) return "";

    const category = categories.find((cat) => cat.slug === categorySlug);
    const subCategory = category?.subcategories?.find(
      (sub) => sub.slug === subCategorySlug
    );

    return subCategory?.name || "";
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [submitAction, setSubmitAction] = useState<"draft" | "publish">(
    "publish"
  );

  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    id: initialProductData.id,
    name: initialProductData.name || "",
    description: initialProductData.description || "",
    specifications: initialProductData.specifications || "",
    price: initialProductData.price || 0, //?.toString() || "0",
    images: initialProductData.images,
    status: initialProductData.status,
    productQuantity: initialProductData.productQuantity || 0, //?.toString() || "0",
    category: initialProductData.category || [],
    subCategory: initialProductData.subCategory || [],
    storePassword: "",
    firstApprovedAt: initialProductData.firstApprovedAt,
    productType: initialProductData.productType,
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof ProductFormData, string>> & { images?: string }
  >({});

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

    // Combine existing previews with new files for total count check
    const currentImageCount = initialProductData?.images?.length || 0;
    const totalNewImages = imageFiles.length + fileArray.length;

    if (currentImageCount + totalNewImages > MAX_IMAGE_NUMBER) {
      toast.error(
        `You can only have up to ${MAX_IMAGE_NUMBER} images in total.`
      );
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

    setImageFiles((prevFiles) => [...prevFiles, ...fileArray]);

    // Create preview URLs for new files
    const newPreviews = fileArray.map((file) => URL.createObjectURL(file));
    setImagePreviews((prevPreviews) => [...prevPreviews, ...newPreviews]);
  };

  const removeImage = (index: number, isNewFile: boolean) => {
    if (isNewFile) {
      const newFiles = imageFiles.filter((_, i) => i !== index);
      const newPreviews = imagePreviews.filter(
        (_, i) => i !== index + (initialProductData?.images?.length || 0)
      );
      URL.revokeObjectURL(
        imagePreviews[index + (initialProductData?.images?.length || 0)]
      );
      setImageFiles(newFiles);
      setImagePreviews(newPreviews);
    } else {
      // This is an existing image from initialProductData
      // const updatedInitialImages =
      //   initialProductData?.images?.filter((_, i) => i !== index) || [];
      // formData.images = updatedInitialImages;
      // In a real implementation, you'd update the backend here
      toast.info("Existing images can only be removed by updating the product");
    }
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
  // FORM SUBMISSION
  // ============================================================================

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    action: "draft" | "publish"
  ) => {
    e.preventDefault();
    setSubmitAction(action);

    const editedProduct = ProductFactory.creatUploadProduct(formData);
    // Image validation for publish
    const totalImages =
      (initialProductData?.images?.length || 0) + imageFiles.length;
    const productValidationResult = editedProduct.validate(action, totalImages);

    if (!productValidationResult.hasErrors) {
      setErrors(productValidationResult.newErrors);
      return;
    }

    try {
      setError(null);
      setUploadProgress(10);

      const prepareProductData = async () => {
        let finalImageUrls: string[] = initialProductData?.images || [];

        // Upload new images to Cloudinary if any
        if (imageFiles.length > 0) {
          const newImageUrls = await uploadImagesToCloudinary(imageFiles);
          finalImageUrls = [...finalImageUrls, ...newImageUrls];
        }

        return {
          ...formData,
          storeId,
          images: finalImageUrls,
          category:
            formData.category && formData.category.length > 0
              ? slugify(formData.category)
              : [],
          subCategory:
            formData.subCategory && formData.subCategory.length > 0
              ? slugify(formData.subCategory)
              : [],
          submitAction: action,
          price: Number(formData.price),
          productQuantity: Number(formData.productQuantity),
        };
      };

      if (action === "draft") {
        setIsLoadingDraft(true);
        setUploadProgress(30);
        const productData = await prepareProductData();
        setUploadProgress(80);

        const response = await fetch(`/api/store/products/${productId}`, {
          method: "PUT",
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

        toast.success("Your changes have been saved as draft.");
      } else if (action === "publish") {
        setIsLoading(true);
        setUploadProgress(30);
        const productData = await prepareProductData();
        setUploadProgress(80);

        const response = await fetch(`/api/store/products/${productId}`, {
          method: "PUT",
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

        toast.success("Product Updated Successfully!");
        router.push(`/store/${storeId}/products`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update product"
      );
      setError(["Failed to update product"]);
    } finally {
      setIsLoading(false);
      setIsLoadingDraft(false);
      setUploadProgress(0);
    }
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

  const allImagePreviews = (initialProductData?.images || []).concat(
    imagePreviews.slice(initialProductData?.images?.length || 0)
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#14a800]/10 rounded-lg">
                <Package className="h-6 w-6 text-[#14a800]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Edit Product
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Update the details of your existing product.
                </p>
              </div>
            </div>

            {/* Desktop Submit Buttons */}
            <div className="hidden md:flex gap-2 justify-between">
              {/* Show this btn only when the product status is in draft mode. */}
              {formData.status === ProductStatusEnum.Draft && (
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
                      <SaveIcon className="mr-2 h-4 w-4" />
                      Save as Draft
                    </>
                  )}
                </Button>
              )}

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
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          {isLoading ||
            (isLoadingDraft && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {submitAction === "draft"
                      ? "Saving Draft..."
                      : "Saving Changes..."}
                  </span>
                  <span className="text-sm text-gray-500">
                    {uploadProgress}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            ))}
        </div>

        {/* Main Form */}
        <form
          id="product-edit-form"
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
                  <FileText className="h-5 w-5 text-[#14a800]" />
                  <CardTitle className="text-xl">Product Information</CardTitle>
                </div>
                <CardDescription>
                  Update detailed information about your product.
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
                  <DollarSign className="h-5 w-5 text-[#14a800]" />
                  <CardTitle className="text-xl">Pricing & Inventory</CardTitle>
                </div>
                <CardDescription>
                  Update your product price and inventory levels.
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
                      value={formData.price === 0 ? "" : formData.price}
                      onChange={(e) => {
                        const value = e.target.value;
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
                    {formData.price && Number(formData.price) > 0 && (
                      <p className="text-xs text-green-600">
                        ₦
                        {Number(formData.price).toLocaleString("en-NG", {
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
                          : formData.productQuantity
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
                    {formData.productQuantity &&
                      Number(formData.productQuantity) > 0 && (
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
                  <Tag className="h-5 w-5 text-[#14a800]" />
                  <CardTitle className="text-lg">Category</CardTitle>
                </div>
                <CardDescription>
                  Update the category for your product.
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
                  <ImageIcon className="h-5 w-5 text-[#14a800]" />
                  <CardTitle className="text-lg">Product Images</CardTitle>
                </div>
                <CardDescription>
                  Update your product images ({MAX_IMAGE_NUMBER} max).
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
                {allImagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {allImagePreviews.map((src, index) => (
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
                          onClick={() =>
                            removeImage(
                              index,
                              index >= (initialProductData?.images?.length || 0)
                            )
                          }
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
                    {allImagePreviews.length}/{MAX_IMAGE_NUMBER} images
                  </span>
                  {allImagePreviews.length > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[#14a800] border-[#14a800]"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  )}
                </div>
                {errors.images && (
                  <p className="text-sm text-red-500 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.images}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Security Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-[#14a800]" />
                  <CardTitle className="text-lg">Security</CardTitle>
                </div>
                <CardDescription>
                  Verify your identity to save changes.
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
          {/* Show this btn only when the product status is in draft mode. */}
          {formData.status === ProductStatusEnum.Draft && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
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
          )}

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
                Saving Changes...
              </>
            ) : (
              <>
                Save Changes
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
