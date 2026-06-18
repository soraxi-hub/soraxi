"use client";

import React from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
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
import type { FirstStepProps } from "../../../../types/waitlist-wizard.types";

export const BusinessContactStep: React.FC<FirstStepProps> = ({
  formData,
  errors,
  onFormDataChange,
  onNext,
  isLoading,
}) => {
  const getValidationIcon = (field: keyof typeof formData) => {
    if (errors[field]) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (formData[field] && !errors[field])
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Business & Contact Information
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Tell us about yourself and your business. This helps us understand who
          you are before you join the platform.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            Step 1 of 3: Business & Contact
          </CardTitle>
          <CardDescription>
            Your personal details and business name
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Business Name */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="businessName" className="text-sm font-medium">
                Business Name <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("businessName")}
            </div>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => onFormDataChange("businessName", e.target.value)}
              placeholder="e.g. Ade's Fashion Hub"
              disabled={isLoading}
              className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
            />
            {errors.businessName && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.businessName}
              </p>
            )}
            <p className="text-xs text-gray-500">
              The name customers will see on your store
            </p>
          </div>

          <Separator />

          {/* Owner Name */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="ownerName" className="text-sm font-medium">
                Your Full Name <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("ownerName")}
            </div>
            <Input
              id="ownerName"
              value={formData.ownerName}
              onChange={(e) => onFormDataChange("ownerName", e.target.value)}
              placeholder="e.g. Adewale Okonkwo"
              disabled={isLoading}
              className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
            />
            {errors.ownerName && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.ownerName}
              </p>
            )}
          </div>

          <Separator />

          {/* Email */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("email")}
            </div>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => onFormDataChange("email", e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
            />
            {errors.email && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.email}
              </p>
            )}
            <p className="text-xs text-gray-500">
              You&apos;ll receive your waitlist status and invite link here
            </p>
          </div>

          <Separator />

          {/* Phone */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("phone")}
            </div>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => onFormDataChange("phone", e.target.value)}
              placeholder="e.g. 08012345678"
              disabled={isLoading}
              className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
            />
            {errors.phone && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-col gap-3 pt-4">
        <div className="hidden md:flex justify-end">
          <Button
            onClick={onNext}
            disabled={isLoading}
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            Next Step
          </Button>
        </div>
        <div className="flex md:hidden">
          <Button
            onClick={onNext}
            disabled={isLoading}
            className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            Next Step
          </Button>
        </div>
      </div>
    </div>
  );
};

BusinessContactStep.displayName = "BusinessContactStep";
