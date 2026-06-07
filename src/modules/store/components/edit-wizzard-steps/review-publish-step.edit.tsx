"use client";

import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Loader2,
  SaveIcon,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import type {
  EditProductFormData,
  EditProductImages,
} from "../../../../types/edit-wizard.types";
import { renderRichText } from "@/modules/products/product-detail/product-tabs";

interface ReviewPublishStepProps {
  formData: EditProductFormData;
  images: EditProductImages;
  errors: Partial<Record<keyof EditProductFormData, string>>;
  uploadProgress: number;
  isLoading?: boolean;
  onFormDataChange: (field: keyof EditProductFormData, value: string) => void;
  onPublish: () => Promise<void>;
  onPrevious: () => Promise<void>;
}

export function ReviewPublishStep({
  formData,
  images,
  errors,
  uploadProgress,
  isLoading = false,
  onFormDataChange,
  onPublish,
  onPrevious,
}: ReviewPublishStepProps) {
  const getValidationIcon = (fieldName: keyof EditProductFormData) => {
    if (errors[fieldName]) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (formData[fieldName] && !errors[fieldName]) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header – matches upload step */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Review & Publish
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review your changes and publish the updated product
        </p>
      </div>

      {/* Progress Indicator – matches upload step style */}
      {isLoading && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Publishing Product...
                </span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <Progress
                value={uploadProgress}
                indicatorClassName="bg-[#14a800]"
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Product Summary Card – matches upload step styling */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Product Summary</CardTitle>
            <CardDescription>Current product details</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Basic Info Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Product Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="rounded p-3">
                  <p className="text-gray-500 text-xs">Product Name</p>
                  <p className="font-medium">{formData.name}</p>
                </div>

                {formData.description && (
                  <div className="rounded p-3">
                    <p className="text-gray-500 text-xs">Description</p>
                    {renderRichText(formData.description)}
                  </div>
                )}

                {formData.specifications && (
                  <div className="rounded p-3">
                    <p className="text-gray-500 text-xs">Specifications</p>
                    {renderRichText(formData.specifications)}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Pricing & Inventory Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Pricing & Inventory
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded p-3">
                  <p className="text-gray-500 text-xs">Price</p>
                  <p className="font-medium">
                    ₦{(formData.price ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded p-3">
                  <p className="text-gray-500 text-xs">Quantity</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formData.productQuantity} units
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Category & Audience Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Category & Audience
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Category:</span>
                  <Badge variant="secondary">{formData.category?.[0]}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Subcategory:</span>
                  <Badge variant="secondary">{formData.subCategory?.[0]}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Target Audience:
                  </span>
                  <Badge variant="secondary">
                    {formData.targetAudience?.[0]}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Images Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Product Images
              </h4>
              <Badge variant="outline">
                {images.existingUrls.length + images.newFiles.length} image(s)
              </Badge>
              {images.newFiles.length > 0 && (
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  ({images.newFiles.length} new)
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Card – matches upload step */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Security & Publishing</CardTitle>
            <CardDescription>
              Enter your store password to secure this submission
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="store-password" className="text-sm font-medium">
                  Store Password <span className="text-red-500">*</span>
                </Label>
                {getValidationIcon("storePassword")}
              </div>
              <Input
                id="store-password"
                type="password"
                value={formData.storePassword}
                onChange={(e) =>
                  onFormDataChange("storePassword", e.target.value)
                }
                placeholder="Enter your store password"
                disabled={isLoading}
                className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
              />
              {errors.storePassword && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {errors.storePassword}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Your password is required for security verification
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Important Notes Card – matches upload step (no amber background) */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-semibold pb-3">Before you publish:</h4>
            <ul className="text-sm space-y-1">
              <li>• Review all changes carefully</li>
              <li>• Changes will update your product immediately</li>
              <li>• Ensure all details are accurate</li>
              <li>• Your password is required for security</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons – matches upload step layout */}
      <div className="flex justify-between gap-3 pt-4">
        <Button onClick={onPrevious} disabled={isLoading} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button
          onClick={onPublish}
          disabled={isLoading}
          className="bg-[#14a800] hover:bg-[#14a800]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <SaveIcon className="mr-2 h-4 w-4" />
              Publish Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

ReviewPublishStep.displayName = "ReviewPublishStep";
