"use client";

import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardDescription,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { Separator } from "@/components/ui/separator";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import type { EditProductFormData } from "@/types/edit-wizard.types";
import { quillFormats, quillModules } from "@/types/upload-wizard.types";
import { Button } from "@/components/ui/button";

interface BasicInfoStepProps {
  formData: EditProductFormData;
  errors: Partial<Record<keyof EditProductFormData, string>>;
  onFieldChange: (
    field: keyof EditProductFormData,
    value: string | number,
  ) => void;
  onNext: () => Promise<void>;
  onPrevious: () => void;
  isLoading?: boolean;
  onGenerateDescription: () => Promise<void>;
  isGeneratingDescription: boolean;
  currentStep: number;
}

/**
 * Edit wizard step for product basic information
 * Allows editing: name, description, specifications
 */
export function BasicInfoStep({
  formData,
  errors,
  onFieldChange,
  onNext,
  onPrevious,
  isLoading = false,
  onGenerateDescription,
  isGeneratingDescription,
  currentStep,
}: BasicInfoStepProps) {
  const getValidationIcon = (fieldName: keyof EditProductFormData) => {
    if (errors[fieldName]) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (formData[fieldName] && !errors[fieldName]) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };
  const anyLoading = isLoading || isGeneratingDescription;

  return (
    <div className="space-y-6">
      {/* Header Section (matches upload step style) */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Edit Product Information
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Update your product&apos;s basic details. These changes will be saved
          when you proceed.
        </p>
      </div>

      {/* Main Card */}
      <SoraxiCard>
        <SoraxiCardHeader className="pb-4">
          <SoraxiCardTitle className="text-xl">
            Step {currentStep + 1} of 5: Basic Information
          </SoraxiCardTitle>
          <SoraxiCardDescription>
            Update your product name and core details
          </SoraxiCardDescription>
        </SoraxiCardHeader>

        <SoraxiCardContent className="space-y-6">
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
                onChange={(value) => onFieldChange("specifications", value)}
                modules={quillModules}
                formats={quillFormats}
                className="h-60 bg-white text-black pb-10"
              />
            </div>
            {errors.specifications && (
              <p className="text-sm text-red-500 flex items-center mt-2">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.specifications}
              </p>
            )}
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                List key specifications, features, and technical details
              </p>
            </div>
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
                onChange={(value) => onFieldChange("description", value)}
                modules={quillModules}
                formats={quillFormats}
                className="h-60 bg-white text-black pb-10"
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
        </SoraxiCardContent>
      </SoraxiCard>

      {/* Navigation Buttons - matches upload step layout (single button) */}
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
