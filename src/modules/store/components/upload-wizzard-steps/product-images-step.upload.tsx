"use client";

import React from "react";
import Image from "next/image";
import { ChevronLeft, Loader2, SaveIcon, Upload, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MAX_IMAGE_NUMBER } from "@/domain/products/product-upload";
import type { ProductImagesStepProps } from "../../../../types/upload-wizard.types";
import { toast } from "sonner";

/**
 * Product Images Step Component
 *
 * Step 4 of the product upload wizard
 * Handles image upload with drag/drop, preview, and removal
 *
 * Fields:
 * - Product Images (required: min 1, max 5)
 * - Supports JPEG, PNG, WebP
 * - Max 5MB per image
 */
export const ProductImagesStep: React.FC<ProductImagesStepProps> = ({
  imageFiles,
  imagePreviews,
  dragActive,
  onImageFilesChange,
  onImagePreviewsChange,
  onDragActiveChange,
  onRemoveImage,
  onNext,
  onPrevious,
  isLoading,
  isLoadingDraft,
  onSaveDraft,
}) => {
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      onDragActiveChange(true);
    } else if (e.type === "dragleave") {
      onDragActiveChange(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragActiveChange(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files);

    // Check if adding these files would exceed the limit
    if (imageFiles.length + fileArray.length > MAX_IMAGE_NUMBER) {
      toast.info(
        `You can only upload up to ${MAX_IMAGE_NUMBER} images total. You currently have ${imageFiles.length} image(s).`,
      );
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    // Validate all files
    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        toast.info("Only JPEG, PNG, and WebP images are allowed");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.info("Each image must be less than 5MB");
        return;
      }
    }

    // Add new files to existing files
    const newImageFiles = [...imageFiles, ...fileArray];
    onImageFilesChange(newImageFiles);

    // Generate previews for new files
    const newPreviews = fileArray.map((file) => URL.createObjectURL(file));
    onImagePreviewsChange([...imagePreviews, ...newPreviews]);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Product Images
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Upload high-quality images of your product (minimum 1, maximum{" "}
          {MAX_IMAGE_NUMBER})
        </p>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Step 4 of 5: Product Images</CardTitle>
          <CardDescription>
            Upload images with drag & drop or file selection
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Upload Area */}
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
              onChange={handleImageChange}
              disabled={isLoading || imageFiles.length >= MAX_IMAGE_NUMBER}
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
          {/* {errors.images && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-200">
                {errors.images}
              </p>
            </div>
          )} */}

          {/* Image Count Info */}
          {imageFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {imageFiles.length}/{MAX_IMAGE_NUMBER} images
              </Badge>
              <p className="text-xs text-gray-500">
                {imageFiles.length >= MAX_IMAGE_NUMBER
                  ? "Maximum images reached"
                  : `${MAX_IMAGE_NUMBER - imageFiles.length} more allowed`}
              </p>
            </div>
          )}

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Image Preview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group"
                    >
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveImage(index)}
                        disabled={isLoading}
                        className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* Image Number Badge */}
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs rounded px-2 py-1">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tips */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">
              Tips for better product images:
            </h4>
            <ul className="text-sm space-y-1">
              <li>• Use clear, well-lit photos</li>
              <li>• Show product from multiple angles</li>
              <li>• Keep file sizes under 5MB</li>
              <li>• Use JPEG or PNG format for best quality</li>
              <li>• Include product in use if possible</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Navigation & Action Buttons */}
      <div className="flex flex-col gap-3 pt-4">
        {/* Main Actions - Desktop Layout */}
        <div className="hidden md:flex justify-between gap-3">
          <Button
            onClick={onPrevious}
            disabled={isLoading || isLoadingDraft}
            variant="outline"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={onSaveDraft}
              disabled={isLoading}
              variant="outline"
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
              onClick={onNext}
              disabled={isLoading}
              className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
            >
              Next Step
            </Button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex md:hidden flex-col gap-2">
          <Button
            onClick={onNext}
            disabled={isLoading}
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            Next Step
          </Button>

          <Button
            onClick={onPrevious}
            disabled={isLoading || isLoadingDraft}
            variant="outline"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button
            onClick={onSaveDraft}
            disabled={isLoading}
            variant="outline"
            className="w-full"
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
        </div>
      </div>
    </div>
  );
};

ProductImagesStep.displayName = "ProductImagesStep";
