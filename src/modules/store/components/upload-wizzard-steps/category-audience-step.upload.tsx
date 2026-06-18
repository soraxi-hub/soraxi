"use client";

import React, { useMemo } from "react";
import { AlertCircle, CheckCircle, Loader2, SaveIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { categories, getSubcategoryNames } from "@/constants/constant";
import { targetAudience as targetAudienceConstant } from "@/constants/fields-constants";
import type { CategoryAudienceStepProps } from "../../../../types/upload-wizard.types";

/**
 * Category & Audience Step Component
 *
 * Step 3 of the product upload wizard
 * Collects product category, subcategory, and target audience
 *
 * Fields:
 * - Category (required)
 * - Subcategory (required, dependent on category)
 * - Target Audience (required)
 */
export const CategoryAudienceStep: React.FC<CategoryAudienceStepProps> = ({
  formData,
  errors,
  onFormDataChange,
  onNext,
  isLoading,
  isLoadingDraft,
  onSaveDraft,
}) => {
  // ============================================================================
  // STATE & COMPUTED VALUES
  // ============================================================================

  // Get subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!formData.category || formData.category.length === 0) {
      return [];
    }
    return getSubcategoryNames(formData.category[0]) || [];
  }, [formData.category]);

  // Get target audience description
  // const selectedAudienceDescription = useMemo(() => {
  //   if (!formData.targetAudience || formData.targetAudience.length === 0) {
  //     return null;
  //   }
  //   return targetAudienceConstant.find(
  //     (aud) => aud.name === (formData.targetAudience ?? [])[0],
  //   )?.description;
  // }, [formData.targetAudience]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleCategoryChange = (value: string) => {
    // Reset subcategory when category changes
    onFormDataChange("category", [value]);
    onFormDataChange("subCategory", []);
  };

  const handleSubcategoryChange = (value: string) => {
    onFormDataChange("subCategory", [value]);
  };

  const handleTargetAudienceChange = (value: string) => {
    onFormDataChange("targetAudience", [value]);
  };

  // ============================================================================
  // VALIDATION ICON HELPER
  // ============================================================================

  const getValidationIcon = (fieldName: keyof typeof formData) => {
    if (errors[fieldName]) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (
      formData[fieldName] &&
      (Array.isArray(formData[fieldName])
        ? (formData[fieldName] as unknown[]).length > 0
        : true) &&
      !errors[fieldName]
    ) {
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
          Category & Audience
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Categorize your product and identify your target market
        </p>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            Step 1 of 5: Category & Audience
          </CardTitle>
          <CardDescription>
            Select category, subcategory, and target audience
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Category Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Product Category <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("category")}
            </div>
            <Select
              value={formData.category?.[0] || ""}
              onValueChange={handleCategoryChange}
              disabled={isLoading}
            >
              <SelectTrigger
                id="category"
                className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800] w-full"
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.name}>
                    {cat.name}
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
            <p className="text-xs text-gray-500">
              Choose the primary category for your product
            </p>
          </div>

          <Separator />

          {/* Subcategory Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="subcategory" className="text-sm font-medium">
                Subcategory <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("subCategory")}
            </div>
            <Select
              value={formData.subCategory?.[0] || ""}
              onValueChange={handleSubcategoryChange}
              disabled={
                !formData.category ||
                formData.category.length === 0 ||
                isLoading
              }
            >
              <SelectTrigger
                id="subcategory"
                className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800] w-full"
              >
                <SelectValue
                  placeholder={
                    !formData.category || formData.category.length === 0
                      ? "Select a category first"
                      : "Select a subcategory"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableSubcategories.map((subcat) => (
                  <SelectItem key={subcat} value={subcat}>
                    {subcat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.subCategory && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.subCategory}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Choose a more specific subcategory
            </p>
          </div>

          <Separator />

          {/* Target Audience Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="audience" className="text-sm font-medium">
                Target Audience <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("targetAudience")}
            </div>
            <Select
              value={formData.targetAudience?.[0] || ""}
              onValueChange={handleTargetAudienceChange}
              disabled={isLoading}
            >
              <SelectTrigger
                id="audience"
                className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800] w-full"
              >
                <SelectValue placeholder="Select target audience" />
              </SelectTrigger>
              <SelectContent>
                {targetAudienceConstant.map((audience) => (
                  <SelectItem key={audience.name} value={audience.name}>
                    {audience.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetAudience && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.targetAudience}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Who is this product designed for?
            </p>

            {/* Audience Description */}
            {/* {selectedAudienceDescription && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mt-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {selectedAudienceDescription}
                </p>
              </div>
            )} */}
          </div>

          {/* Summary */}
          {formData.category &&
            formData.category.length > 0 &&
            formData.subCategory &&
            formData.subCategory.length > 0 &&
            formData.targetAudience &&
            formData.targetAudience.length > 0 && (
              <>
                <Separator />
                <div className="bg-[#14a800]/5 border border-[#14a800]/20 rounded-lg p-4 dark:bg-transparent">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">
                    Summary
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Category:
                      </span>
                      <Badge variant="secondary">{formData.category[0]}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Subcategory:
                      </span>
                      <Badge variant="secondary">
                        {formData.subCategory[0]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Audience:
                      </span>
                      <Badge variant="secondary">
                        {formData.targetAudience[0]}
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            )}
        </CardContent>
      </Card>

      {/* Navigation & Action Buttons */}
      <div className="flex flex-col gap-3 pt-4">
        {/* Main Actions - Desktop Layout */}
        <div className="hidden md:flex justify-between gap-3">
          <Button onClick={onSaveDraft} disabled={isLoading} variant="outline">
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

          <div className="flex gap-3">
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
            onClick={onNext}
            disabled={isLoading}
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            Next Step
          </Button>
        </div>
      </div>
    </div>
  );
};

CategoryAudienceStep.displayName = "CategoryAudienceStep";
