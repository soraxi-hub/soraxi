"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
} from "lucide-react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { uploadImagesToCloudinary } from "@/lib/utils/cloudinary-upload";
import { toast } from "sonner";
import { categories, getSubcategoryNames, slugify } from "@/constants/constant";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";
import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";
import AlertUI from "@/modules/shared/alert";
import { useRouter } from "next/navigation";

type Output = inferProcedureOutput<
  AppRouter["storeProducts"]["getStoreProductById"]
>;
type ProductData = Output["product"];

const MIN_IMAGE_NUMBER = 3;
const MAX_IMAGE_NUMBER = 5;

/**
 * Product Form Schema
 * Comprehensive validation schema for product editing with detailed error messages
 */
const productFormSchema = z.object({
  name: z
    .string()
    .min(5, "Product name must be at least 5 characters")
    .max(100, "Product name too long"),
  productType: z.enum(["Product", "digitalproducts"]).optional(),
  price: z.number().min(500, "Price must be greater than 499").optional(),
  sizes: z
    .array(
      z.object({
        size: z.string().min(1, "Size is required"),
        price: z.number().min(0.01, "Price must be greater than 0"),
        quantity: z.number().min(0, "Quantity cannot be negative"),
      })
    )
    .optional(),
  productQuantity: z.number().min(0, "Quantity cannot be negative"),
  images: z.array(z.string()).optional(), // This will store Cloudinary URLs
  description: z.string().min(10, "Description must be at least 10 characters"),
  specifications: z
    .string()
    .min(10, "Specifications must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().min(1, "Subcategory is required"),
  storePassword: z.string().min(1, "Store password is required"),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  storeId: string;
  productId: string; // Required for edit mode
  initialProductData: ProductData; // Required for edit mode
}

/**
 * Modern Product Form Component (Edit Only)
 *
 * A comprehensive, modern product editing form with:
 * - Clean, card-based layout with proper spacing
 * - Rich text editors for descriptions and specifications
 * - Advanced image upload with drag-and-drop support
 * - Real-time form validation with visual feedback
 * - Responsive design optimized for all screen sizes
 * - Professional styling with soraxi-green brand colors
 * - Accessibility features and proper ARIA labels
 * - Progress indicators and loading states
 */
export function ProductEditForm({
  storeId,
  productId,
  initialProductData,
}: ProductFormProps) {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(
    Array.isArray(initialProductData.category)
      ? categories.find((cat) => cat.slug === initialProductData.category[0])
          ?.name
      : initialProductData.category || ""
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState(
    Array.isArray(initialProductData.subCategory)
      ? categories
          .find((cat) => cat.slug === initialProductData.category[0])
          ?.subcategories.find(
            (sub) => sub.slug === initialProductData.subCategory[0]
          )?.name
      : initialProductData.subCategory || ""
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // ============================================================================
  // FORM CONFIGURATION
  // ============================================================================

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, dirtyFields },
    trigger,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    mode: "onChange", // Real-time validation
    defaultValues: {
      ...initialProductData,
      // Ensure category and subCategory are strings for select components
      category: Array.isArray(initialProductData.category)
        ? initialProductData.category[0]
        : initialProductData.category,
      subCategory: Array.isArray(initialProductData.subCategory)
        ? initialProductData.subCategory[0]
        : initialProductData.subCategory,
    },
  });

  // ============================================================================
  // FORM WATCHERS
  // ============================================================================

  const watchedCategory = watch("category");
  const watchedSubCategory = watch("subCategory");
  const description = watch("description");
  const specifications = watch("specifications");
  const productName = watch("name");
  const price = watch("price");
  const quantity = watch("productQuantity");

  // console.log("Form values:", {
  //   category: selectedCategory,
  //   subCategory: selectedSubCategory,
  //   // description,
  //   // specifications,
  //   // productName,
  //   // price,
  //   // quantity,
  // });

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
  // IMAGE UPLOAD HANDLERS
  // ============================================================================

  /**
   * Handle drag and drop events for image upload
   */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  /**
   * Handle dropped files
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  /**
   * Handle file input change
   */
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  /**
   * Process and validate uploaded files
   */
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

    // Validate file types and sizes
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

  /**
   * Remove uploaded image (either new file or existing URL)
   */
  const removeImage = (index: number, isNewFile: boolean) => {
    if (isNewFile) {
      const newFiles = imageFiles.filter((_, i) => i !== index);
      const newPreviews = imagePreviews.filter(
        (_, i) => i !== index + (initialProductData?.images?.length || 0)
      ); // Adjust index for new files
      URL.revokeObjectURL(
        imagePreviews[index + (initialProductData?.images?.length || 0)]
      ); // Revoke URL for new file
      setImageFiles(newFiles);
      setImagePreviews(newPreviews);
    } else {
      // This is an existing image from initialProductData
      const updatedInitialImages =
        initialProductData?.images?.filter((_, i) => i !== index) || [];
      // Update the form value directly for existing images
      setValue("images", updatedInitialImages);
      setImagePreviews(
        updatedInitialImages.concat(
          imagePreviews.slice(initialProductData?.images?.length || 0)
        )
      );
    }
  };

  // ============================================================================
  // CATEGORY HANDLERS
  // ============================================================================

  /**
   * Handle category selection change
   */
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedSubCategory("");
    setValue("category", value);
    setValue("subCategory", "");
    trigger(["category", "subCategory"]);
  };

  /**
   * Handle subcategory selection change
   */
  const handleSubCategoryChange = (value: string) => {
    setSelectedSubCategory(value);
    setValue("subCategory", value);
    trigger("subCategory");
  };

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  /**
   * Handle form submission with comprehensive validation and error handling
   */
  const onSubmit = async (data: ProductFormData) => {
    try {
      setIsLoading(true);
      setUploadProgress(10);

      // Validate images
      const totalImages =
        (initialProductData?.images?.length || 0) + imageFiles.length;
      if (totalImages < MIN_IMAGE_NUMBER) {
        toast.error(
          `Please select at least ${MIN_IMAGE_NUMBER} product images`
        );
        return;
      }

      setUploadProgress(30);

      let finalImageUrls: string[] = initialProductData?.images || [];

      // Upload new images to Cloudinary if any
      if (imageFiles.length > 0) {
        const newImageUrls = await uploadImagesToCloudinary(imageFiles);
        finalImageUrls = [...finalImageUrls, ...newImageUrls];
      }
      setUploadProgress(60);

      // Prepare product data for update
      const productData = {
        ...data,
        storeID: storeId,
        description,
        specifications,
        images: finalImageUrls,
        category: [slugify(watchedCategory)], // Slugify category so that MongoDB can better perform category search
        subCategory: [slugify(watchedSubCategory)], // Slugify subcategory for better search by MongoDB
      };

      setUploadProgress(80);

      // Submit update to API
      const response = await fetch(`/api/store/products/${productId}`, {
        method: "PUT", // Use PUT for editing
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      setUploadProgress(100);

      if (!response.ok) {
        const { message, code, cause } = await parseErrorFromResponse(response);
        console.error("Edit Product error:", { message, code, cause });
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Product Updated Successfully!");
      router.push(`/store/${storeId}/products`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update product"
      );
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // ============================================================================
  // CLEANUP EFFECTS
  // ============================================================================

  useEffect(() => {
    return () => {
      // Revoke URLs for newly created previews
      imageFiles.forEach((file) =>
        URL.revokeObjectURL(URL.createObjectURL(file))
      );
    };
  }, [imageFiles]);

  /**
   * Get validation status icon
   */
  const getValidationIcon = (fieldName: keyof ProductFormData) => {
    if (errors[fieldName]) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (dirtyFields[fieldName] && !errors[fieldName]) {
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
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

            {/* Desktop Submit Button */}
            <div className="hidden md:block">
              <Button
                type="submit"
                form="product-form"
                className="bg-[#14a800] hover:bg-[#14a800]/90 text-white px-6 py-2"
                disabled={isLoading || !isValid}
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
          {isLoading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Saving Product Updates...
                </span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <Progress
                value={uploadProgress}
                className="h-2"
                indicatorClassName="bg-soraxi-green"
              />
            </div>
          )}
        </div>

        {/* Main Form */}
        <form
          id="product-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {error && <AlertUI message={error} variant={`destructive`} />}
            {/* Product Information Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
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
                    {...register("name")}
                    placeholder="Enter a descriptive product name"
                    className="h-11 border-gray-200 focus:border-primary focus:ring-primary"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.name.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {productName?.length || 0}/100 characters
                  </p>
                </div>

                <Separator />

                {/* Product Description */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">
                      Product Description *
                    </Label>
                    {getValidationIcon("description")}
                  </div>
                  <div className="overflow-hidde h-70">
                    <ReactQuill
                      value={description || ""}
                      onChange={(value) => {
                        setValue("description", value);
                        trigger("description");
                      }}
                      modules={quillModules}
                      formats={quillFormats}
                      className="h-56"
                    />
                  </div>
                  {errors.description && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Product Specifications */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm font-medium">
                      Product Specifications *
                    </Label>
                    {getValidationIcon("specifications")}
                  </div>
                  <div className="overflow-hidde h-70">
                    <ReactQuill
                      value={specifications || ""}
                      onChange={(value) => {
                        setValue("specifications", value);
                        trigger("specifications");
                      }}
                      modules={quillModules}
                      formats={quillFormats}
                      className="h-56"
                    />
                  </div>
                  {errors.specifications && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.specifications.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory Card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-primary" />
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
                        Price (₦) *
                      </Label>
                      {getValidationIcon("price")}
                    </div>
                    <Input
                      id="product-price"
                      {...register("price", { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="h-11 border-gray-200 focus:border-primary focus:ring-primary"
                    />
                    {errors.price && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.price.message}
                      </p>
                    )}
                    {price && price > 0 && (
                      <p className="text-xs text-green-600">
                        ₦
                        {price.toLocaleString("en-NG", {
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
                        Quantity *
                      </Label>
                      {getValidationIcon("productQuantity")}
                    </div>
                    <Input
                      id="product-quantity"
                      {...register("productQuantity", { valueAsNumber: true })}
                      type="number"
                      min="0"
                      placeholder="0"
                      className="h-11 border-gray-200 focus:border-primary focus:ring-primary"
                    />
                    {errors.productQuantity && (
                      <p className="text-sm text-red-500 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {errors.productQuantity.message}
                      </p>
                    )}
                    {quantity > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {quantity} units in stock
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
                  <Tag className="h-5 w-5 text-primary" />
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
                    <Label className="text-sm font-medium">
                      Main Category *
                    </Label>
                    {getValidationIcon("category")}
                  </div>
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className="h-11 border-gray-200 focus:border-primary focus:ring-primary">
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
                      {errors.category.message}
                    </p>
                  )}
                </div>

                {/* Subcategory */}
                {selectedCategory && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm font-medium">
                        Subcategory *
                      </Label>
                      {getValidationIcon("subCategory")}
                    </div>
                    <Select
                      value={selectedSubCategory}
                      onValueChange={handleSubCategoryChange}
                    >
                      <SelectTrigger className="h-11 border-gray-200 focus:border-primary focus:ring-primary">
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
                        {errors.subCategory.message}
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
                  <ImageIcon className="h-5 w-5 text-primary" />
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
                      ? "border-primary bg-primary/5"
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
                      <p className="text-sm font-medium text-gray-900">
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
                      className="text-primary border-primary"
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
                  <Shield className="h-5 w-5 text-primary" />
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
                    {...register("storePassword")}
                    type="password"
                    placeholder="Enter your store password"
                    className="h-11 border-gray-200 focus:border-primary focus:ring-primary"
                  />
                  {errors.storePassword && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.storePassword.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>

        {/* Mobile Submit Button */}
        <div className="md:hidden mt-8">
          <Button
            type="submit"
            form="product-form"
            className="w-full bg-[#14a800] hover:bg-[#14a800]/90 text-white h-12"
            disabled={isLoading || !isValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Product...
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
