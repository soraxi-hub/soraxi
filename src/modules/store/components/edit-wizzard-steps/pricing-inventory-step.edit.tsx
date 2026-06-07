"use client";

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
import type {
  EditProductFormData,
  ProductChanges,
} from "../../../../types/edit-wizard.types";

interface PricingInventoryStepProps {
  formData: EditProductFormData;
  errors: Partial<Record<keyof EditProductFormData, string>>;
  onFieldChange: (field: keyof EditProductFormData, value: number) => void;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  isLoading?: boolean;
  hasChanges?: ProductChanges;
}

export function PricingInventoryStep({
  formData,
  errors,
  onFieldChange,
  onNext,
  onPrevious,
  isLoading = false,
  hasChanges = {},
}: PricingInventoryStepProps) {
  const getValidationIcon = (fieldName: keyof EditProductFormData) => {
    if (errors[fieldName]) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (formData[fieldName] && !errors[fieldName]) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const isChanged = (field: keyof ProductChanges) => hasChanges[field] || false;

  return (
    <div className="space-y-6">
      {/* Header (matches upload step style) */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pricing & Inventory
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Update your product price and available quantity
        </p>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            Step 2 of 5: Pricing & Inventory
          </CardTitle>
          <CardDescription>
            Edit your product price and inventory
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Price Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="price" className="text-sm font-medium">
                  Product Price <span className="text-red-500">*</span>
                </Label>
                {getValidationIcon("price")}
              </div>
              {isChanged("price") && (
                <Badge variant="secondary" className="text-xs">
                  Modified
                </Badge>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                ₦
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  onFieldChange("price", parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
                disabled={isLoading}
                className="h-11 pl-8 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
              />
            </div>
            {errors.price && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.price}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Enter the price customers will pay for this product
            </p>
          </div>

          <Separator />

          {/* Quantity Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="quantity" className="text-sm font-medium">
                  Available Quantity <span className="text-red-500">*</span>
                </Label>
                {getValidationIcon("productQuantity")}
              </div>
              {isChanged("productQuantity") && (
                <Badge variant="secondary" className="text-xs">
                  Modified
                </Badge>
              )}
            </div>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.productQuantity}
              onChange={(e) =>
                onFieldChange(
                  "productQuantity",
                  parseInt(e.target.value, 10) || 0,
                )
              }
              placeholder="0"
              disabled={isLoading}
              className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
            />
            {errors.productQuantity && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.productQuantity}
              </p>
            )}
            <p className="text-xs text-gray-500">
              How many units of this product do you have in stock?
            </p>
          </div>

          {/* Summary Box – matches upload step style */}
          {formData.price &&
            formData.productQuantity &&
            formData.price > 0 &&
            formData.productQuantity > 0 && (
              <>
                <Separator />
                <div className="bg-[#14a800]/5 border border-[#14a800]/20 rounded-lg p-4 dark:bg-transparent">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                    Summary
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600 dark:text-gray-400">
                      Price:{" "}
                      <span className="font-semibold">
                        ₦{formData.price.toLocaleString()}
                      </span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Quantity:{" "}
                      <span className="font-semibold">
                        {formData.productQuantity} units
                      </span>
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Total Value:{" "}
                      <span className="font-semibold">
                        ₦
                        {(
                          formData.price * formData.productQuantity
                        ).toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>
              </>
            )}
        </CardContent>
      </Card>

      {/* Navigation Buttons – matches upload step layout */}
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

PricingInventoryStep.displayName = "PricingInventoryStep";
