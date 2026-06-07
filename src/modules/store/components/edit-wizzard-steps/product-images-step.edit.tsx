"use client";

import React from "react";
import Image from "next/image";
import { AlertCircle, ChevronLeft, Upload, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { EditProductFormData } from "../../../../types/edit-wizard.types";
import { useProductImages } from "@/hooks/use-product-images.edit";
import { MAX_PRODUCT_IMAGES } from "@/constants/image.constants";

interface ProductImagesStepProps {
  images: {
    existingUrls: string[];
    newFiles: File[];
    previewUrls: string[];
  };
  onRemoveImage: (index: number, isNewFile: boolean) => void;
  onImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isLoading?: boolean;
  errors: Partial<Record<keyof EditProductFormData, string>>;
}

export function ProductImagesStep({
  images,
  onRemoveImage,
  onImagesChange,
  onNext,
  onPrevious,
  isLoading = false,
  errors,
}: ProductImagesStepProps) {
  // Hook provides drag & drop and file handling logic
  const { imageFiles, dragActive, handleDrag, handleDrop, handleImageChange } =
    useProductImages({ existingImageCount: images.existingUrls.length });

  const totalImages = images.existingUrls.length + imageFiles.length;

  return (
    <div className="space-y-6">
      {/* Header – matches upload step */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Product Images
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Update your product images (minimum 1, maximum {MAX_PRODUCT_IMAGES})
        </p>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Step 4 of 5: Product Images</CardTitle>
          <CardDescription>
            Upload new images or manage existing ones
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Drag & Drop Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? "border-[#14a800] bg-[#14a800]/5"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100 dark:bg-transparent dark:border-gray-700"
            }`}
          >
            <input
              type="file"
              id="image-upload"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => {
                handleImageChange(e); // hook handles file validation and state
                onImagesChange(e); // parent's onChange if needed
              }}
              disabled={isLoading || totalImages >= MAX_PRODUCT_IMAGES}
              className="hidden"
            />

            <label htmlFor="image-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Drag and drop your images here
              </p>
              <p className="text-xs text-gray-500 mb-3">
                or click to select files from your computer
              </p>
              <p className="text-xs text-gray-500">
                Supported: JPEG, PNG, WebP (Max 5MB each)
              </p>
            </label>
          </div>

          {/* Error Message */}
          {errors.images && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-200">
                {errors.images}
              </p>
            </div>
          )}

          {/* Image Count & Modified Badge */}
          {totalImages > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {totalImages}/{MAX_PRODUCT_IMAGES} images
              </Badge>
              <p className="text-xs text-gray-500">
                {totalImages >= MAX_PRODUCT_IMAGES
                  ? "Maximum images reached"
                  : `${MAX_PRODUCT_IMAGES - totalImages} more allowed`}
              </p>
            </div>
          )}

          {/* Existing Images Section */}
          {images.existingUrls.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Existing Images
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.existingUrls.map((url, index) => (
                    <div
                      key={`existing-${index}`}
                      className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group"
                    >
                      <Image
                        src={url}
                        alt={`Existing ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => onRemoveImage(index, false)}
                        disabled={isLoading}
                        className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs rounded px-2 py-1">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* New Images Section */}
          {imageFiles.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  New Images
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imageFiles.map((file, index) => {
                    const previewUrl = URL.createObjectURL(file);
                    return (
                      <div
                        key={`new-${index}`}
                        className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group"
                      >
                        <Image
                          src={previewUrl}
                          alt={`New ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <button
                          onClick={() =>
                            onRemoveImage(
                              images.existingUrls.length + index,
                              true,
                            )
                          }
                          disabled={isLoading}
                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs rounded px-2 py-1">
                          {images.existingUrls.length + index + 1}
                        </div>
                        <Badge className="absolute top-1 left-1 bg-green-500">
                          New
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Tips Section – matches upload step */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Image Management Tips:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Click the X button to remove any image</li>
              <li>• New images are marked with a green badge</li>
              <li>• Keep file sizes under 5MB for best performance</li>
              <li>• You can have up to {MAX_PRODUCT_IMAGES} images total</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons – consistent with upload step */}
      <div className="flex justify-between gap-3 pt-4">
        <Button onClick={onPrevious} disabled={isLoading} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button
          onClick={onNext}
          disabled={isLoading}
          className="bg-[#14a800] hover:bg-[#14a800]/90 text-white"
        >
          Next Step
        </Button>
      </div>
    </div>
  );
}

ProductImagesStep.displayName = "ProductImagesStep";
