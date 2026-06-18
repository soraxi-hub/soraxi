"use client";

import React from "react";
import Image from "next/image";
import { AlertCircle, ChevronLeft, Loader2, Upload, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ProofStepProps } from "../../../../types/waitlist-wizard.types";

const MAX_SAMPLES = 6;
const MAX_SAMPLE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const BusinessProofStep: React.FC<ProofStepProps> = ({
  formData,
  errors,
  onFormDataChange,
  onPrevious,
  onSubmit,
  isLoading,
  productSampleFiles,
  productSamplePreviews,
  dragActive,
  onProductSampleFilesChange,
  onProductSamplePreviewsChange,
  onDragActiveChange,
  onRemoveSample,
}) => {
  // ─── Image handlers — same pattern as ProductImagesStep ──────────────────

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
    if (e.dataTransfer.files?.[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files);

    if (productSampleFiles.length + fileArray.length > MAX_SAMPLES) {
      toast.info(
        `You can upload up to ${MAX_SAMPLES} samples. You currently have ${productSampleFiles.length}.`,
      );
      return;
    }

    for (const file of fileArray) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.info("Only JPEG, PNG, and WebP images are allowed");
        return;
      }
      if (file.size > MAX_SAMPLE_SIZE) {
        toast.info("Each image must be less than 5MB");
        return;
      }
    }

    onProductSampleFilesChange([...productSampleFiles, ...fileArray]);
    const newPreviews = fileArray.map((f) => URL.createObjectURL(f));
    onProductSamplePreviewsChange([...productSamplePreviews, ...newPreviews]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Business Proof & Product Samples
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Help us verify your business and see the kind of products you plan to
          sell. At least one proof and one sample image are required.
        </p>
      </div>

      {/* Business Proof Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Step 3 of 3: Business Proof</CardTitle>
          <CardDescription>
            Provide at least one of the following to verify your business
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Proof error banner (top-level) */}
          {errors.cacNumber && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-200">
                {errors.cacNumber}
              </p>
            </div>
          )}

          {/* CAC Number */}
          <div className="space-y-2">
            <Label htmlFor="cacNumber" className="text-sm font-medium">
              CAC Registration Number
            </Label>
            <Input
              id="cacNumber"
              value={formData.cacNumber}
              onChange={(e) => onFormDataChange("cacNumber", e.target.value)}
              placeholder="e.g. RC-1234567"
              disabled={isLoading}
              className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
            />
            <p className="text-xs text-gray-500">
              Corporate Affairs Commission registration number (if registered)
            </p>
          </div>

          <Separator />

          {/* Instagram */}
          <div className="space-y-2">
            <Label htmlFor="instagram" className="text-sm font-medium">
              Instagram Handle
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                @
              </span>
              <Input
                id="instagram"
                value={formData.instagramHandle}
                onChange={(e) =>
                  onFormDataChange("instagramHandle", e.target.value)
                }
                placeholder="yourbusiness"
                disabled={isLoading}
                className="h-11 pl-7 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
              />
            </div>
            <p className="text-xs text-gray-500">
              Your business Instagram page so we can see your current activity
            </p>
          </div>

          <Separator />

          {/* Other proof URL */}
          <div className="space-y-2">
            <Label htmlFor="otherProofUrl" className="text-sm font-medium">
              Other Business Link
            </Label>
            <Input
              id="otherProofUrl"
              type="url"
              value={formData.otherProofUrl}
              onChange={(e) =>
                onFormDataChange("otherProofUrl", e.target.value)
              }
              placeholder="https://yourstore.com or your Twitter/Facebook URL"
              disabled={isLoading}
              className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
            />
            <p className="text-xs text-gray-500">
              Any other link that shows your business is active
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Product Samples Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Product Samples</CardTitle>
          <CardDescription>
            Upload photos of products you plan to sell (min 1, max {MAX_SAMPLES}
            )
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sample error */}
          {errors.productSamples && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-200">
                {errors.productSamples}
              </p>
            </div>
          )}

          {/* Upload area — same pattern as ProductImagesStep */}
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
              id="sample-upload"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
              disabled={isLoading || productSampleFiles.length >= MAX_SAMPLES}
              className="hidden"
            />
            <label htmlFor="sample-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Drag and drop product photos here
              </p>
              <p className="text-xs text-gray-500 mb-3">
                or click to select files
              </p>
              <p className="text-xs text-gray-500">
                JPEG, PNG, WebP · Max 5MB each
              </p>
            </label>
          </div>

          {/* Count */}
          {productSampleFiles.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {productSampleFiles.length}/{MAX_SAMPLES} samples
              </Badge>
              <p className="text-xs text-gray-500">
                {productSampleFiles.length >= MAX_SAMPLES
                  ? "Maximum reached"
                  : `${MAX_SAMPLES - productSampleFiles.length} more allowed`}
              </p>
            </div>
          )}

          {/* Previews — same grid as ProductImagesStep */}
          {productSamplePreviews.length > 0 && (
            <>
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {productSamplePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group"
                  >
                    <Image
                      src={preview}
                      alt={`Sample ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      onClick={() => onRemoveSample(index)}
                      disabled={isLoading}
                      className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      title="Remove sample"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs rounded px-2 py-1">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Tips */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">
              Tips for sample photos:
            </h4>
            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Show the actual products you plan to sell</li>
              <li>• Clear, well-lit photos work best</li>
              <li>• Multiple angles help us understand your range</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col gap-3 pt-4">
        <div className="hidden md:flex justify-between gap-3">
          <Button onClick={onPrevious} disabled={isLoading} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isLoading}
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </div>

        <div className="flex md:hidden flex-col gap-2">
          <Button
            onClick={onSubmit}
            disabled={isLoading}
            className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
          <Button onClick={onPrevious} disabled={isLoading} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
        </div>
      </div>
    </div>
  );
};

BusinessProofStep.displayName = "BusinessProofStep";
