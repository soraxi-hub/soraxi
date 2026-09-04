"use client";

import React from "react";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
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
import type { FirstStepProps } from "@/types/waitlist-wizard.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { categories, INSTITUTIONS } from "@/constants/constant";

export const BusinessContactStep: React.FC<FirstStepProps> = ({
  formData,
  errors,
  onFormDataChange,
  onNext,
  isLoading,
}) => {
  const getValidationIcon = (field: keyof typeof formData) => {
    if (errors[field]) return <AlertCircle className="h-4 w-4 text-red-500" />;
    const value = formData[field];
    const filled = value !== "" && value !== null;
    if (filled && !errors[field])
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your Business
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Tell us who you are and what you sell. This helps us understand your
          business before you join the platform.
        </p>
      </div>

      <SoraxiCard>
        <SoraxiCardHeader className="pb-4">
          <SoraxiCardTitle className="text-xl">
            Step 1 of 2: Business &amp; Contact
          </SoraxiCardTitle>
          <SoraxiCardDescription>
            Your details, your business name, and what you sell
          </SoraxiCardDescription>
        </SoraxiCardHeader>

        <SoraxiCardContent className="space-y-6">
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

          {/* Institution */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Label htmlFor="institution" className="text-sm font-medium">
                Institution <span className="text-red-500">*</span>
              </Label>
              {getValidationIcon("institution")}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Institution information"
                    className="p-1 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>What is Institution?</DialogTitle>
                    <DialogDescription>
                      Choose the tertiary institution or campus closest to you.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-2">
                    <p className="text-sm text-gray-700">
                      This field helps us localize search results and surface
                      nearby vendors. For example, if you are in Lagos and the
                      nearest tertiary institution is UNILAG, select "UNILAG".
                      Pick the campus closest to your primary business location.
                    </p>
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Got it</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Select
              value={formData.institution}
              onValueChange={(val) => onFormDataChange("institution", val)}
              disabled={isLoading}
            >
              <SelectTrigger
                id="institution"
                className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800] w-full"
              >
                <SelectValue placeholder="Select your institution" />
              </SelectTrigger>
              <SelectContent>
                {INSTITUTIONS.map((inst) => (
                  <SelectItem key={inst} value={inst}>
                    {inst}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.institution && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.institution}
              </p>
            )}
            <p className="text-xs text-gray-500">
              The institution your store will be associated with
            </p>
          </div>

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
              onValueChange={(val) => onFormDataChange("categoryId", val)}
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
            <p className="text-xs text-gray-500">
              The main category you&apos;ll be selling in
            </p>
          </div>

          {/* Dropship toggle */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">
                Are you a dropshipper? <span className="text-red-500">*</span>
              </Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </SoraxiCardContent>
      </SoraxiCard>

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
