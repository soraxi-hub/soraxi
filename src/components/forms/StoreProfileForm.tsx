"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, ImageIcon } from "lucide-react";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";
import type { StoreProfileData } from "@/types/onboarding";
import Image from "next/image";

/**
 * Store Profile Form Schema
 * Validates store name, description, and optional branding assets
 */
const storeProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(50, "Store name must be less than 50 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
});

type StoreProfileFormData = z.infer<typeof storeProfileSchema>;

interface StoreProfileFormProps {
  onNextAction: () => void;
}

/**
 * Store Profile Form Component
 * First step of onboarding - collects basic store information
 */
export function StoreProfileForm({ onNextAction }: StoreProfileFormProps) {
  const { state, updateData, markStepCompleted } = useStoreOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<StoreProfileFormData>({
    resolver: zodResolver(storeProfileSchema),
    defaultValues: state.data.profile || {
      name: "",
      description: "",
      logoUrl: "",
      bannerUrl: "",
    },
    mode: "onChange",
  });

  /**
   * Handle form submission
   * Updates context data and proceeds to next step
   */
  const onSubmit = (data: StoreProfileFormData) => {
    const profileData: StoreProfileData = {
      name: data.name,
      description: data.description,
      logoUrl: data.logoUrl || undefined,
      bannerUrl: data.bannerUrl || undefined,
    };

    updateData("profile", profileData);
    markStepCompleted("profile");
    onNextAction();
  };

  // Watch form values for real-time updates
  const watchedValues = watch();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Store Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Store Name *
        </Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Enter your store name"
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          This will be displayed as your store&apos;s public name
        </p>
      </div>

      {/* Store Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Store Description *
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Describe what your store sells and what makes it unique"
          rows={4}
          className={errors.description ? "border-destructive" : ""}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Help customers understand what your store is about (
          {watchedValues.description?.length || 0}/500 characters)
        </p>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label htmlFor="logoUrl" className="text-sm font-medium">
          Store Logo (Optional)
        </Label>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
            {watchedValues.logoUrl ? (
              <Image
                src={watchedValues.logoUrl || "/placeholder.svg"}
                alt="Store logo preview"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <Input
              id="logoUrl"
              {...register("logoUrl")}
              placeholder="https://example.com/logo.png"
              className={errors.logoUrl ? "border-destructive" : ""}
            />
            {errors.logoUrl && (
              <p className="text-sm text-destructive mt-1">
                {errors.logoUrl.message}
              </p>
            )}
          </div>
          <Button type="button" variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Recommended size: 200x200px. Supports JPG, PNG formats.
        </p>
      </div>

      {/* Banner Upload */}
      <div className="space-y-2">
        <Label htmlFor="bannerUrl" className="text-sm font-medium">
          Store Banner (Optional)
        </Label>
        <div className="space-y-4">
          <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
            {watchedValues.bannerUrl ? (
              <Image
                src={watchedValues.bannerUrl || "/placeholder.svg"}
                alt="Store banner preview"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="text-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Banner Preview</p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Input
              id="bannerUrl"
              {...register("bannerUrl")}
              placeholder="https://example.com/banner.png"
              className={`flex-1 ${
                errors.bannerUrl ? "border-destructive" : ""
              }`}
            />
            <Button type="button" variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
          {errors.bannerUrl && (
            <p className="text-sm text-destructive">
              {errors.bannerUrl.message}
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Recommended size: 1200x300px. This will be displayed at the top of
          your store page.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end pt-6 border-t border-border">
        <Button
          type="submit"
          disabled={!isValid}
          className="bg-soraxi-green hover:bg-soraxi-green/90 text-white"
        >
          Continue to Business Info
        </Button>
      </div>
    </form>
  );
}
