"use client";

import React from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Loader2,
  SaveIcon,
  Sparkles,
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
import {
  quillFormats,
  quillModules,
  type BasicInfoStepProps,
} from "@/types/upload-wizard.types";

/**
 * Basic Info Step Component
 *
 * Step 1 of the product upload wizard
 * Collects product name, description, and specifications
 *
 * Fields:
 * - Product Name (required)
 * - Description (optional, rich text)
 * - Specifications (optional, rich text)
 */
export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  errors,
  onFormDataChange,
  onNext,
  onPrevious,
  isLoading,
  isLoadingDraft,
  onSaveDraft,
  onGenerateDescription,
  isGeneratingDescription,
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

  const anyLoading = isLoading || isLoadingDraft || isGeneratingDescription;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Product Information
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Provide detailed information about your product. These details will
          help customers understand what you&apos;re offering.
        </p>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            Step 3 of 5: Basic Information
          </CardTitle>
          <CardDescription>
            Add product name, description, and specifications
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Product Name Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="product-name" className="text-sm font-medium">
                Product Name <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("name")}
            </div>
            <Input
              id="product-name"
              value={formData.name}
              onChange={(e) => onFormDataChange("name", e.target.value)}
              placeholder="Enter a descriptive product name"
              disabled={anyLoading}
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

          {/* Product Specifications Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">
                Product Specifications
              </Label>
              {getValidationIcon("specifications")}
            </div>
            <div className="overflow-hidden rounded-md border border-gray-200">
              <ReactQuill
                value={formData.specifications}
                onChange={(value) => onFormDataChange("specifications", value)}
                modules={quillModules}
                formats={quillFormats}
                className="h-56 bg-white text-black"
                readOnly={anyLoading}
              />
            </div>
            {errors.specifications && (
              <p className="text-sm text-red-500 flex items-center mt-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.specifications}
              </p>
            )}
            <p className="text-xs text-gray-500">
              List key specifications, features, and technical details
            </p>
          </div>

          <Separator />

          {/* Product Description Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">Product Description</Label>
              {getValidationIcon("description")}
            </div>
            <div className="overflow-hidden rounded-md border border-gray-200">
              <ReactQuill
                value={formData.description}
                onChange={(value) => onFormDataChange("description", value)}
                modules={quillModules}
                formats={quillFormats}
                className="h-56 bg-white text-black"
                readOnly={anyLoading}
              />
            </div>
            {errors.description && (
              <p className="text-sm text-red-500 flex items-center mt-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.description}
              </p>
            )}

            {/* Description actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
              <p className="text-xs text-gray-500">
                Use rich formatting to make your description stand out, or let
                AI draft one for you.
              </p>

              {/*
               * CHANGED: was onClick={() => console.log("Do something")}
               * Now calls the prop that wires back up to the wizard hook.
               *
               * Button label changes between "Generate" and "Regenerate"
               * depending on whether a description already exists.
               */}
              <Button
                onClick={onGenerateDescription}
                disabled={anyLoading}
                variant="outline"
                className="shrink-0"
              >
                {isGeneratingDescription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 text-[#14a800]" />
                    {formData.description
                      ? "Regenerate description"
                      : "Generate description with AI"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation & Action Buttons — unchanged from original */}
      <div className="flex flex-col gap-3 pt-4">
        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between gap-3">
          <Button onClick={onPrevious} disabled={anyLoading} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={onSaveDraft}
              disabled={isLoading || isGeneratingDescription}
              variant="outline"
            >
              {isLoadingDraft ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Draft…
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
              disabled={anyLoading}
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
            disabled={anyLoading}
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            Next Step
          </Button>

          <Button onClick={onPrevious} disabled={anyLoading} variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          <Button
            onClick={onSaveDraft}
            disabled={isLoading || isGeneratingDescription}
            variant="outline"
            className="w-full"
          >
            {isLoadingDraft ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Draft…
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

BasicInfoStep.displayName = "BasicInfoStep";
