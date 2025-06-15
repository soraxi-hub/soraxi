"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, FileText, ArrowLeft } from "lucide-react";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";
import type { BusinessInfoData } from "@/types/onboarding";

/**
 * Business Info Form Schema
 * Validates business type, registration details, and required documents
 */
const businessInfoSchema = z
  .object({
    type: z.enum(["individual", "company"], {
      required_error: "Please select a business type",
    }),
    businessName: z.string().optional(),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    documentUrls: z.array(z.string().url()).optional(),
  })
  .refine(
    (data) => {
      // If company is selected, business name and registration number are required
      if (data.type === "company") {
        return (
          data.businessName &&
          data.businessName.length > 0 &&
          data.registrationNumber &&
          data.registrationNumber.length > 0
        );
      }
      return true;
    },
    {
      message:
        "Business name and registration number are required for companies",
      path: ["businessName"],
    }
  );

type BusinessInfoFormData = z.infer<typeof businessInfoSchema>;

interface BusinessInfoFormProps {
  onNextAction: () => void;
  onBackAction: () => void;
}

/**
 * Business Information Form Component
 * Second step of onboarding - collects business registration details
 */
export function BusinessInfoForm({
  onNextAction,
  onBackAction,
}: BusinessInfoFormProps) {
  const { state, updateData, markStepCompleted } = useStoreOnboarding();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<BusinessInfoFormData>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: state.data.businessInfo || {
      type: "individual",
      businessName: "",
      registrationNumber: "",
      taxId: "",
      documentUrls: [],
    },
    mode: "onChange",
  });

  const businessType = watch("type");

  /**
   * Handle form submission
   * Updates context data and proceeds to next step
   */
  const onSubmit = (data: BusinessInfoFormData) => {
    const businessInfoData: BusinessInfoData = {
      type: data.type,
      businessName: data.businessName || undefined,
      registrationNumber: data.registrationNumber || undefined,
      taxId: data.taxId || undefined,
      documentUrls: data.documentUrls || [],
    };

    updateData("businessInfo", businessInfoData);
    markStepCompleted("business-info");
    onNextAction();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Business Type Selection */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Business Type *</Label>
        <RadioGroup
          value={businessType}
          onValueChange={(value) =>
            setValue("type", value as "individual" | "company")
          }
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="flex items-center space-x-2 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="individual" id="individual" />
            <div className="flex-1">
              <Label
                htmlFor="individual"
                className="font-medium cursor-pointer"
              >
                Individual Seller
              </Label>
              <p className="text-sm text-muted-foreground">
                Selling as an individual person
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="company" id="company" />
            <div className="flex-1">
              <Label htmlFor="company" className="font-medium cursor-pointer">
                Registered Business
              </Label>
              <p className="text-sm text-muted-foreground">
                Selling as a registered company
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Company-specific fields */}
      {businessType === "company" && (
        <>
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-sm font-medium">
              Business Name *
            </Label>
            <Input
              id="businessName"
              {...register("businessName")}
              placeholder="Enter your registered business name"
              className={errors.businessName ? "border-destructive" : ""}
            />
            {errors.businessName && (
              <p className="text-sm text-destructive">
                {errors.businessName.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              This should match your business registration documents
            </p>
          </div>

          {/* Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="registrationNumber" className="text-sm font-medium">
              Business Registration Number *
            </Label>
            <Input
              id="registrationNumber"
              {...register("registrationNumber")}
              placeholder="e.g., CAC123456789 (for Nigerian companies)"
              className={errors.registrationNumber ? "border-destructive" : ""}
            />
            {errors.registrationNumber && (
              <p className="text-sm text-destructive">
                {errors.registrationNumber.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Your official business registration number from relevant
              authorities
            </p>
          </div>
        </>
      )}

      {/* Tax ID (Optional for both types) */}
      <div className="space-y-2">
        <Label htmlFor="taxId" className="text-sm font-medium">
          Tax Identification Number (Optional)
        </Label>
        <Input
          id="taxId"
          {...register("taxId")}
          placeholder="Enter your tax ID if applicable"
          className={errors.taxId ? "border-destructive" : ""}
        />
        {errors.taxId && (
          <p className="text-sm text-destructive">{errors.taxId.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Required for tax reporting in some regions
        </p>
      </div>

      {/* Document Upload Section */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">
          Supporting Documents {businessType === "company" ? "*" : "(Optional)"}
        </Label>

        <div className="border-2 border-dashed border-border rounded-lg p-6">
          <div className="text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-sm font-medium mb-2">Upload Documents</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {businessType === "company"
                ? "Upload business registration certificate, tax documents, or other relevant business documents"
                : "Upload government-issued ID, utility bills, or other identity verification documents"}
            </p>
            <Button type="button" variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Choose Files
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Supported formats: PDF, JPG, PNG. Maximum file size: 5MB per file.
          {businessType === "company" &&
            " Business registration documents are required for verification."}
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between pt-6 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onBackAction}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Button
          type="submit"
          disabled={!isValid}
          className="bg-soraxi-green hover:bg-soraxi-green/90 text-white"
        >
          Continue to Shipping
        </Button>
      </div>
    </form>
  );
}
