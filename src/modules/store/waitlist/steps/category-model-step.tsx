"use client";

import React, { useMemo } from "react";
import { AlertCircle, CheckCircle, ChevronLeft } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories, getSubcategoryNames } from "@/constants/constant";
import type { StepWithNavProps } from "../../../../types/waitlist-wizard.types";

const INVENTORY_SIZES = [
  { value: "small", label: "Small", description: "Fewer than 20 products" },
  { value: "medium", label: "Medium", description: "20 – 100 products" },
  { value: "large", label: "Large", description: "100+ products" },
] as const;

export const CategoryModelStep: React.FC<StepWithNavProps> = ({
  formData,
  errors,
  onFormDataChange,
  onNext,
  onPrevious,
  isLoading,
}) => {
  const availableSubcategories = useMemo(() => {
    if (!formData.categoryName) return [];
    return getSubcategoryNames(formData.categoryName) ?? [];
  }, [formData.categoryName]);

  const handleCategoryChange = (value: string) => {
    // value is the category slug; find the full name for display + subcat lookup
    const cat = categories.find((c) => c.slug === value);
    onFormDataChange("categoryId", value);
    onFormDataChange("categoryName", cat?.name ?? value);
    onFormDataChange("subCategory", "");
  };

  const getValidationIcon = (field: keyof typeof formData) => {
    if (errors[field]) return <AlertCircle className="h-4 w-4 text-red-500" />;
    const val = formData[field];
    const filled = val !== "" && val !== 0 && val !== null;
    if (filled && !errors[field])
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Category, Inventory & Business Model
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Help us understand what you sell, how much stock you carry, and how
          your business operates.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            Step 2 of 3: Category & Model
          </CardTitle>
          <CardDescription>
            Category, inventory range, pricing, and dropship status
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">
                Product Category <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("categoryId")}
            </div>
            <Select
              value={formData.categoryId}
              onValueChange={handleCategoryChange}
              disabled={isLoading}
            >
              <SelectTrigger className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800] w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.categoryId}
              </p>
            )}
          </div>

          <Separator />

          {/* Subcategory */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">
                Subcategory <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("subCategory")}
            </div>
            <Select
              value={formData.subCategory}
              onValueChange={(val) => onFormDataChange("subCategory", val)}
              disabled={!formData.categoryId || isLoading}
            >
              <SelectTrigger className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800] w-full">
                <SelectValue
                  placeholder={
                    !formData.categoryId
                      ? "Select a category first"
                      : "Select a subcategory"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableSubcategories.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
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
          </div>

          <Separator />

          {/* Inventory Size */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">
                Estimated Inventory Size <span className="text-red-500">*</span>
              </Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {INVENTORY_SIZES.map((size) => {
                const isSelected =
                  formData.estimatedInventorySize === size.value;
                return (
                  <button
                    key={size.value}
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      onFormDataChange("estimatedInventorySize", size.value)
                    }
                    className={`
                      flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all
                      ${
                        isSelected
                          ? "border-[#14a800] bg-[#14a800]/5"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {size.label}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {size.description}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.estimatedInventorySize && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.estimatedInventorySize}
              </p>
            )}
          </div>

          <Separator />

          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Estimated Price Range (₦) <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="priceMin" className="text-xs text-gray-500">
                  Minimum Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    ₦
                  </span>
                  <Input
                    id="priceMin"
                    type="number"
                    min={0}
                    value={formData.estimatedPriceMin || ""}
                    onChange={(e) =>
                      onFormDataChange(
                        "estimatedPriceMin",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    disabled={isLoading}
                    placeholder="0"
                    className="h-11 pl-8 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
                  />
                </div>
                {errors.estimatedPriceMin && (
                  <p className="text-xs text-red-500">
                    {errors.estimatedPriceMin}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="priceMax" className="text-xs text-gray-500">
                  Maximum Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    ₦
                  </span>
                  <Input
                    id="priceMax"
                    type="number"
                    min={0}
                    value={formData.estimatedPriceMax || ""}
                    onChange={(e) =>
                      onFormDataChange(
                        "estimatedPriceMax",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    disabled={isLoading}
                    placeholder="0"
                    className="h-11 pl-8 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
                  />
                </div>
                {errors.estimatedPriceMax && (
                  <p className="text-xs text-red-500">
                    {errors.estimatedPriceMax}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Dropship toggle */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">
                Are you a dropshipper? <span className="text-red-500">*</span>
              </Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    label: "Yes — I dropship",
                    sub: "I don't hold physical stock",
                    value: true,
                  },
                  {
                    label: "No — I hold stock",
                    sub: "I have physical inventory",
                    value: false,
                  },
                ] as const
              ).map((opt) => {
                const isSelected = formData.isDropshipper === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={isLoading}
                    onClick={() => onFormDataChange("isDropshipper", opt.value)}
                    className={`
                      flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all
                      ${
                        isSelected
                          ? "border-[#14a800] bg-[#14a800]/5"
                          : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {opt.label}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.isDropshipper && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.isDropshipper}
              </p>
            )}
          </div>

          {/* Summary */}
          {formData.categoryId &&
            formData.subCategory &&
            formData.estimatedInventorySize &&
            formData.isDropshipper !== null && (
              <>
                <Separator />
                <div className="bg-[#14a800]/5 border border-[#14a800]/20 rounded-lg p-4 dark:bg-transparent">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">
                    Summary
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{formData.categoryName}</Badge>
                    <Badge variant="secondary">{formData.subCategory}</Badge>
                    <Badge variant="secondary">
                      {
                        INVENTORY_SIZES.find(
                          (s) => s.value === formData.estimatedInventorySize,
                        )?.label
                      }{" "}
                      inventory
                    </Badge>
                    <Badge variant="secondary">
                      {formData.isDropshipper ? "Dropshipper" : "Holds stock"}
                    </Badge>
                  </div>
                </div>
              </>
            )}
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
            onClick={onNext}
            disabled={isLoading}
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            Next Step
          </Button>
        </div>

        <div className="flex md:hidden flex-col gap-2">
          <Button
            onClick={onNext}
            disabled={isLoading}
            className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            Next Step
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

CategoryModelStep.displayName = "CategoryModelStep";
