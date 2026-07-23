"use client";

import React from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Loader2,
  SaveIcon,
} from "lucide-react";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardDescription,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { ReviewPublishStepProps } from "@/types/upload-wizard.types";
import { renderRichText } from "@/modules/products/product-detail/product-tabs";
import { formatNaira, nairaToKobo } from "@/lib/utils/naira";

/**
 * Review & Publish Step Component
 *
 * Reviews all product information and handles final submission
 * Allows saving as draft or publishing
 *
 * Fields:
 * - Store Password (required for security)
 * - Review Summary (read-only display)
 * - Submit Actions: Save Draft or Publish
 */
export const ReviewPublishStep: React.FC<ReviewPublishStepProps> = ({
  formData,
  imageFiles,
  errors,
  isLoading,
  isLoadingDraft,
  draftProductId,
  onFormDataChange,
  onPublish,
  onSaveDraft,
  onPrevious,
}) => {
  // ============================================================================
  // VALIDATION ICON HELPER
  // ============================================================================

  const getValidationIcon = (fieldName: keyof typeof formData) => {
    if (errors[fieldName]) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (formData[fieldName] && !errors[fieldName]) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Review & Publish
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Review your product information and publish to the marketplace
        </p>
      </div>

      {/* Main Cards */}
      <div className="space-y-6">
        {/* Product Summary Card */}
        <SoraxiCard>
          <SoraxiCardHeader className="pb-4">
            <SoraxiCardTitle className="text-xl">
              Product Summary
            </SoraxiCardTitle>
            <SoraxiCardDescription>
              Review your product details
            </SoraxiCardDescription>
          </SoraxiCardHeader>

          <SoraxiCardContent className="space-y-6">
            {/* Basic Info Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Product Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="rounded p-3">
                  <p className="text-gray-500 text-xs">Product Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formData.name}
                  </p>
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
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatNaira(nairaToKobo(formData.price ?? 0))}
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
                  {formData.category?.[0]}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Subcategory:</span>
                  {formData.subCategory?.[0]}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Target Audience:
                  </span>
                  {formData.targetAudience?.[0]}
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
                {imageFiles.length} image{imageFiles.length !== 1 ? "s" : ""}{" "}
                ready
              </Badge>
            </div>
          </SoraxiCardContent>
        </SoraxiCard>

        {/* Security Card */}
        <SoraxiCard>
          <SoraxiCardHeader className="pb-4">
            <SoraxiCardTitle className="text-xl">
              Security & Publishing
            </SoraxiCardTitle>
            <SoraxiCardDescription>
              Enter your store password to secure this submission
            </SoraxiCardDescription>
          </SoraxiCardHeader>

          <SoraxiCardContent className="space-y-6">
            {/* Store Password Field */}
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
                disabled={isLoading || isLoadingDraft}
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

            {/* Status Info */}
            {draftProductId && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  This product has been previously saved as draft (ID:{" "}
                  <span className="font-mono text-xs">
                    {draftProductId.substring(0, 8)}...
                  </span>
                  )
                </p>
              </div>
            )}
          </SoraxiCardContent>
        </SoraxiCard>

        {/* Important Notes Card */}
        <SoraxiCard>
          <SoraxiCardContent>
            <h4 className="text-sm font-semibold pb-3">Before you publish:</h4>
            <ul className="text-sm space-y-1">
              <li>• Product will be pending marketplace review</li>
              <li>• Ensure all details are accurate before publishing</li>
              <li>• You can save as draft to complete later</li>
            </ul>
          </SoraxiCardContent>
        </SoraxiCard>
      </div>

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
              onClick={onPublish}
              disabled={isLoadingDraft}
              className="bg-[#14a800] hover:bg-[#14a800]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>Publish Product</>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex md:hidden flex-col gap-2">
          <Button
            onClick={onPublish}
            disabled={isLoadingDraft}
            className="w-full bg-[#14a800] hover:bg-[#14a800]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>Publish Product</>
            )}
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

          <Button
            onClick={onPrevious}
            disabled={isLoading || isLoadingDraft}
            variant="outline"
            className="w-full"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
        </div>
      </div>
    </div>
  );
};

ReviewPublishStep.displayName = "ReviewPublishStep";
