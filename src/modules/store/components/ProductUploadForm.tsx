"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";
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
import { toast } from "sonner";
import { ChevronRight, Loader2, Upload, XIcon } from "lucide-react";
import { categories, getSubcategoryNames } from "@/constants/constant";

import ReactQuill from "react-quill-new"; // Use the new ReactQuill package

// Dynamically import ReactQuill to avoid SSR issues
// const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";
import { uploadImagesToCloudinary } from "@/lib/utils/cloudinary-upload";

/**
 * Product Upload Form Schema
 */
const productUploadSchema = z.object({
  name: z.string().min(5, "Product name must be at least 5 characters"),
  productType: z.enum(["Product", "digitalproducts"]).optional(),
  price: z.number().min(0.01, "Price must be greater than 0").optional(),
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
  images: z.array(z.string()).optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  specifications: z
    .string()
    .min(10, "Specifications must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().min(1, "Subcategory is required"),
  storePassword: z.string().min(1, "Store password is required"),
});

type ProductUploadFormData = z.infer<typeof productUploadSchema>;

interface ProductUploadFormProps {
  storeId: string;
  onSuccess?: () => void;
}

/**
 * Product Upload Form Component - Mimicking the original design
 */
export function ProductUploadForm({
  storeId,
  onSuccess,
}: ProductUploadFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  // const [description, setDescription] = useState("");
  // const [specifications, setSpecifications] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
    trigger,
  } = useForm<ProductUploadFormData>({
    resolver: zodResolver(productUploadSchema),
    defaultValues: {
      productType: "Product",
      productQuantity: 0,
      images: [],
      category: "",
      subCategory: "",
      sizes: [],
    },
  });

  const {
    fields: sizeFields,
    append: appendSize,
    remove: removeSize,
  } = useFieldArray({
    control,
    name: "sizes",
  });

  // const watchedPrice = watch("price");
  const watchedCategory = watch("category");
  const watchedSubCategory = watch("subCategory");
  const description = watch("description");
  const specifications = watch("specifications");

  // Size options based on subcategory
  // const getSizeOptions = () => {
  //   if (selectedSubCategory === "Footwear") {
  //     return [
  //       "39",
  //       "39.5",
  //       "40",
  //       "40.5",
  //       "41",
  //       "41.5",
  //       "42",
  //       "42.5",
  //       "43",
  //       "43.5",
  //       "44",
  //       "44.5",
  //       "45",
  //       "45.5",
  //       "46",
  //       "46.5",
  //       "47",
  //       "47.5",
  //       "48",
  //     ];
  //   }
  //   return ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  // };

  // Quill editor modules
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ color: [] }, { background: [] }],
      ["clean"],
    ],
  };

  // Handle image file selection
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);

    // Validate file count
    if (fileArray.length > 3) {
      toast.error("You can only upload up to 3 images");
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

    setImageFiles(fileArray);

    // Create preview URLs
    const previews = fileArray.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  // Handle category change
  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const categoryName = e.target.value;
    setSelectedCategory(categoryName);
  };

  // Handle subcategory change
  const handleSubCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const subCategoryName = e.target.value;
    setSelectedSubCategory(subCategoryName);
  };

  // Handle size and price changes
  // const handleSizePriceChange = (
  //   index: number,
  //   field: "size" | "price" | "quantity",
  //   value: string
  // ) => {
  //   const updatedSizes = [...sizeFields];
  //   updatedSizes[index] = {
  //     ...updatedSizes[index],
  //     [field]:
  //       field === "price" || field === "quantity" ? Number(value) : value,
  //   };
  //   setValue("sizes", updatedSizes);
  // };

  // // Add size
  // const addSize = () => {
  //   appendSize({ size: "", price: 0, quantity: 0 });
  //   setValue("price", 0);
  //   setValue("productQuantity", 0);
  // };

  // // Remove size
  // const removeSizeHandler = (index: number) => {
  //   removeSize(index);
  // };

  // Handle form submission
  const onSubmit = async (data: ProductUploadFormData) => {
    try {
      console.log(errors);

      setIsLoading(true);

      // Validate images
      if (imageFiles.length === 0) {
        toast.error("Please select at least one product image");
        return;
      }

      // Upload images (simulate with placeholder URLs for now)
      // const imageUrls = imageFiles.map(
      //   (_, index) =>
      //     `/placeholder.svg?height=400&width=400&text=Product${index + 1}`
      // );

      const imageUrls = await uploadImagesToCloudinary(imageFiles);

      const productData = {
        ...data,
        storeID: storeId,
        description,
        specifications,
        images: imageUrls,
        category: [watchedCategory],
        subCategory: [watchedSubCategory],
      };

      const response = await fetch("/api/store/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          "Your product has been successfully uploaded and is pending review."
        );

        // Reset form
        reset();
        // setDescription("");
        // setSpecifications("");
        setSelectedCategory("");
        setSelectedSubCategory("");
        setImageFiles([]);
        setImagePreviews([]);
        // setStorePassword("");

        onSuccess?.();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload product"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // const isFashionCategory =
  //   selectedCategory === "Clothing" || selectedCategory === "Fashion";

  return (
    <div className="">
      {/* sm:grid grid-cols-1 flex flex-col gap-6 mt-8 md:grid-cols-2 */}
      <form
        className="grid flex-1 auto-rows-max gap-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex items-center gap-4 text-ellipsis">
          <h1 className=" shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 text-ellipsis">
            Add Product
          </h1>
          <div className="hidden items-center gap-2 md:ml-auto md:flex">
            <Button
              type="submit"
              className="hover:bg-soraxi-green bg-soraxi-green/80"
              disabled={isLoading}
              aria-label="Upload Product"
            >
              {isLoading ? (
                <div className="flex flex-row items-center justify-between w-full">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex flex-row items-center justify-between w-full">
                  <span>Upload</span>
                  <ChevronRight className="ml-2 h-4 w-4" />
                </div>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
          <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
                <CardDescription>
                  Vividly describe your product. We will have to verify this
                  product once it&apos;s been uploaded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <Label
                      htmlFor="product-name"
                      className="text-base font-semibold"
                    >
                      Product Name
                    </Label>
                    <Input
                      id="product-name"
                      {...register("name")}
                      className="block w-full px-4 py-2 mt-2 text-gray-700 dark:text-white placeholder-gray-500 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400"
                      type="text"
                      placeholder="Product Name"
                      aria-label="Product Name"
                      aria-required="true"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <Label
                      htmlFor="product-description"
                      className="text-base font-semibold"
                    >
                      Product Description
                    </Label>
                    <div className="min-h-fit">
                      <ReactQuill
                        id="product-description"
                        value={description}
                        onChange={(value) => {
                          setValue("description", value);
                          trigger("description"); // triggers validation manually
                        }}
                        modules={quillModules}
                        className="h-fit bg-inherit overflow-x-auto"
                        aria-label="Product Description"
                        aria-required="true"
                      />
                    </div>
                    {errors.description && (
                      <p className="text-sm text-destructive">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 w-full">
                    <Label
                      htmlFor="product-specifications"
                      className="text-base font-semibold"
                    >
                      Product Specification
                    </Label>
                    <div className="min-h-fit">
                      <ReactQuill
                        id="product-specifications"
                        value={specifications}
                        onChange={(value) => {
                          setValue("specifications", value);
                          trigger("specifications"); // triggers validation manually
                        }}
                        modules={quillModules}
                        className="h-fit bg-inherit overflow-x-auto"
                        aria-label="Product Specifications"
                        aria-required="true"
                      />
                    </div>
                    {errors.specifications && (
                      <p className="text-sm text-destructive">
                        {errors.specifications.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <>
                      <Label
                        htmlFor="product-price"
                        className="text-base font-semibold"
                      >
                        Product Price{" "}
                      </Label>
                      <Input
                        id="product-price"
                        {...register("price", { valueAsNumber: true })}
                        className="block w-full px-4 py-2 mt-2 text-gray-700 placeholder-gray-500 dark:text-white bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400"
                        type="number"
                        placeholder="Product Price"
                        aria-label="Product Price"
                        aria-required="true"
                        disabled={sizeFields.length > 0}
                        min={0}
                      />
                      {errors.price && (
                        <p className="text-sm text-destructive">
                          {errors.price.message}
                        </p>
                      )}
                    </>
                  </div>
                  <div className="grid gap-3">
                    <Label
                      htmlFor="product-quantity"
                      className="text-base font-semibold"
                    >
                      Product Quantity
                    </Label>
                    <Input
                      id="product-quantity"
                      {...register("productQuantity", {
                        valueAsNumber: true,
                      })}
                      className="block w-full px-4 py-2 mt-2 text-gray-700 placeholder-gray-500 dark:text-white bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400"
                      type="number"
                      placeholder="Product Quantity"
                      aria-label="Product Quantity"
                      aria-required="true"
                      disabled={sizeFields.length > 0}
                      min={0}
                    />
                    {errors.productQuantity && (
                      <p className="text-sm text-destructive">
                        {errors.productQuantity.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2"></div>
          </div>

          <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Product Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 ">
                  <div className="grid gap-3">
                    <Label htmlFor="product-category">Select Category</Label>
                    <select
                      id="product-category"
                      aria-label="Select category"
                      value={selectedCategory}
                      onChange={(e) => {
                        setValue("category", e.target.value);
                        trigger("category"); // triggers validation manually
                        handleCategoryChange(e);
                      }}
                      className="block w-full px-4 py-2 mt-2 text-gray-700 placeholder-gray-500 bg-white border rounded-lg dark:bg-gray-800 dark:text-slate-200 dark:border-gray-600 dark:placeholder-gray-400"
                      aria-required="true"
                    >
                      <option value="" disabled>
                        Select a Category
                      </option>
                      {categories.map((category) => (
                        <option key={category.slug} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-sm text-destructive">
                        {errors.category.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedCategory && (
              <Card>
                <CardHeader>
                  <CardTitle>Product Sub-Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="product-subcategory">
                        Select Sub-Category
                      </Label>
                      <select
                        id="product-subcategory"
                        aria-label="Select sub-category"
                        value={selectedSubCategory}
                        onChange={(e) => {
                          setValue("subCategory", e.target.value);
                          trigger("subCategory"); // triggers validation manually
                          handleSubCategoryChange(e);
                        }}
                        className="block w-full px-4 py-2 mt-2 text-gray-700 placeholder-gray-500 bg-white border rounded-lg dark:bg-gray-800 dark:text-slate-200 dark:border-gray-600 dark:placeholder-gray-400"
                      >
                        <option value="" disabled>
                          Select a Sub-Category
                        </option>
                        {getSubcategoryNames(selectedCategory).map(
                          (subCategory) => (
                            <option key={subCategory} value={subCategory}>
                              {subCategory}
                            </option>
                          )
                        )}
                      </select>
                      {errors.subCategory && (
                        <p className="text-sm text-destructive">
                          {errors.subCategory.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* {isFashionCategory && (
              <Card>
                <CardHeader>
                  <CardTitle>Product Sizes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    {sizeFields.map((sizeObj, index) => {
                      const selectedSizes = sizeFields.map((size) => size.size);
                      const sizeOptions = getSizeOptions();

                      return (
                        <div
                          key={sizeObj.id}
                          className="flex gap-2 items-center mt-2"
                        >
                          <div className="w-full">
                            <Label
                              htmlFor={`size-${index}`}
                              className="pl-2 pb-0.5"
                            >
                              Size
                            </Label>
                            <select
                              id={`size-${index}`}
                              value={sizeObj.size}
                              onChange={(e) =>
                                handleSizePriceChange(
                                  index,
                                  "size",
                                  e.target.value
                                )
                              }
                              className="w-full border p-2 rounded"
                              aria-label={`Size option ${index + 1}`}
                            >
                              <option value="" disabled>
                                Select Size
                              </option>
                              {sizeOptions.map((sizeOption) => (
                                <option
                                  key={sizeOption}
                                  value={sizeOption}
                                  disabled={
                                    sizeObj.size !== sizeOption &&
                                    selectedSizes.includes(sizeOption)
                                  }
                                >
                                  {sizeOption}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-full">
                            <Label
                              htmlFor={`price-${index}`}
                              className="pl-2 pb-0.5"
                            >
                              Price
                            </Label>
                            <Input
                              id={`price-${index}`}
                              value={sizeObj.price}
                              type="number"
                              min={0}
                              onChange={(e) =>
                                handleSizePriceChange(
                                  index,
                                  "price",
                                  e.target.value
                                )
                              }
                              placeholder="Price"
                              className="w-full"
                              aria-label={`Price for size ${
                                sizeObj.size || index + 1
                              }`}
                            />
                          </div>

                          <div className="w-full">
                            <Label
                              htmlFor={`quantity-${index}`}
                              className="pl-2 pb-0.5"
                            >
                              Quantity
                            </Label>
                            <Input
                              id={`quantity-${index}`}
                              value={sizeObj.quantity}
                              type="number"
                              min={0}
                              onChange={(e) =>
                                handleSizePriceChange(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              placeholder="Quantity"
                              className="w-full"
                              aria-label={`Quantity for size ${
                                sizeObj.size || index + 1
                              }`}
                            />
                          </div>

                          <Button
                            type="button"
                            onClick={() => removeSizeHandler(index)}
                            className="bg-transparent hover:bg-transparent hover:text-soraxi-green text-soraxi-green/80 p-2 mt-5"
                            aria-label={`Remove size ${
                              sizeObj.size || index + 1
                            }`}
                            size="icon"
                          >
                            <XIcon width={15} height={15} />
                          </Button>
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      onClick={addSize}
                      className="my-5 hover:bg-soraxi-green bg-soraxi-green/80"
                      aria-label="Add another size option"
                    >
                      Add Size
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )} */}

            {/* Product Images */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Product Images</CardTitle>
                <CardDescription>
                  <p>
                    Please note: You can change your uploaded image once every
                    month. Make sure to upload the correct image.
                  </p>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 pb-6 sm:grid-cols-2">
                  <button
                    type="button"
                    className="flex aspect-square relative w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                    aria-label="Upload product images"
                  >
                    <Upload className="h-10 z-10 w-10 text-muted-foreground" />
                    <span className="sr-only">Upload</span>
                    <Input
                      id="product-images"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      type="file"
                      multiple
                      accept="image/*"
                      aria-label="Product Images (up to 3)"
                      aria-required="true"
                    />
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {imagePreviews.map((src, index) => (
                      <div key={index} className="relative">
                        <Image
                          className="aspect-square rounded-md object-cover"
                          height="200"
                          src={src || "/placeholder.svg"}
                          alt={`Product preview ${index + 1}`}
                          width="200"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 border-t-2 pt-3">
                  <Label
                    htmlFor="store-password"
                    className="text-base font-semibold"
                  >
                    Store Password
                  </Label>
                  <Input
                    id="store-password"
                    {...register("storePassword")}
                    className="block w-full px-4 py-2 mt-2 text-gray-700 dark:text-white placeholder-gray-500 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400"
                    type="password"
                    placeholder="Your Store Password"
                    aria-label="Your Store Password"
                    aria-required="true"
                  />
                  {errors.storePassword && (
                    <p className="text-sm text-destructive">
                      {errors.storePassword.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mobile Submit Button */}
            <div className="flex items-center justify-center gap-2 md:hidden w-full">
              <Button
                type="submit"
                className="w-full hover:bg-soraxi-green bg-soraxi-green/80"
                disabled={isLoading}
                aria-label="Upload Product (Mobile)"
              >
                {isLoading ? (
                  <div className="flex flex-row items-center justify-between w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="flex flex-row items-center justify-between w-full">
                    <span>Upload</span>
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
