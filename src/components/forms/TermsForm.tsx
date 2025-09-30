"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  FileText,
  Shield,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";
// import { useToast } from "@/hooks/use-toast"
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Terms Form Schema
 * Validates agreement to platform terms and conditions
 */
const termsFormSchema = z.object({
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service to continue",
  }),
  agreeToPrivacy: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Privacy Policy to continue",
  }),
  agreeToSeller: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Seller Agreement to continue",
  }),
  confirmInformation: z.boolean().refine((val) => val === true, {
    message: "You must confirm that all information provided is accurate",
  }),
});

type TermsFormData = z.infer<typeof termsFormSchema>;

interface TermsFormProps {
  onBackAction: () => void;
}

/**
 * Terms and Conditions Form Component
 * Final step of onboarding - agreement to platform terms and submission
 */

export function TermsForm({ onBackAction }: TermsFormProps) {
  const { state, updateData, markStepCompleted, saveDraft } =
    useStoreOnboarding();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TermsFormData>({
    resolver: zodResolver(termsFormSchema),
    defaultValues: {
      agreeToTerms: false,
      agreeToPrivacy: false,
      agreeToSeller: false,
      confirmInformation: false,
    },
    mode: "onChange",
  });

  const watchedValues = watch();

  /**
   * Handle final onboarding submission
   * Submits all collected data for review and approval
   */

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onSubmit = async (_data: TermsFormData) => {
    setIsSubmitting(true);

    try {
      // Update terms agreement in context
      updateData("termsAgreed", true);
      markStepCompleted("terms");

      // Save final draft with all data
      await saveDraft();

      // Submit for review
      const response = await fetch("/api/store/onboarding/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: state.storeId,
          onboardingData: {
            ...state.data,
            termsAgreed: true,
          },
          agreementTimestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit onboarding");
      }

      // Success - show confirmation and redirect
      toast.success(
        `Your store has been submitted for review. You'll be notified once it's approved.`
      );

      // Redirect to dashboard or confirmation page
      // window.location.href = "/dashboard/store?onboarding=complete";
      router.push(`/store/${state.storeId}/dashboard`);
    } catch (error) {
      console.error("Onboarding submission error:", error);
      toast.error(`Failed to submit onboarding. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          Terms & Conditions
        </h2>
        <p className="text-sm text-muted-foreground">
          Please review and agree to our terms to complete your store setup.
          Your store will be submitted for review after this step.
        </p>
      </div>

      {/* Onboarding Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-soraxi-green" />
            <span>Onboarding Summary</span>
          </CardTitle>
          <CardDescription>
            Review the information you&#39;ve provided during setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-foreground mb-2">
                Store Profile
              </h4>
              <p className="text-muted-foreground">
                <strong>Name:</strong>{" "}
                {state.data.profile?.name || "Not provided"}
              </p>
              <p className="text-muted-foreground">
                <strong>Description:</strong>{" "}
                {state.data.profile?.description ? "Provided" : "Not provided"}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">
                Business Information
              </h4>
              <p className="text-muted-foreground">
                <strong>Type:</strong>{" "}
                {state.data.businessInfo?.type || "Not provided"}
              </p>
              {state.data.businessInfo?.type === "company" && (
                <p className="text-muted-foreground">
                  <strong>Business Name:</strong>{" "}
                  {state.data.businessInfo?.businessName || "Not provided"}
                </p>
              )}
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Shipping</h4>
              <p className="text-muted-foreground">
                <strong>Methods:</strong> {state.data.shipping?.length || 0}{" "}
                configured
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Agreements */}
      <div className="space-y-4">
        {/* Terms of Service */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Terms of Service</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-52 w-full border border-border rounded-lg p-4 mb-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>1. Acceptance of Terms</strong>
                </p>
                <p>
                  By using our platform, you agree to be bound by these Terms of
                  Service. These terms apply to all sellers, buyers, and
                  visitors of our marketplace.
                </p>
                <p>
                  <strong>2. Seller Responsibilities</strong>
                </p>
                <p>
                  As a seller, you are responsible for providing accurate
                  product descriptions, maintaining inventory, fulfilling orders
                  promptly, and providing excellent customer service.
                </p>
                <p>
                  <strong>3. Prohibited Items</strong>
                </p>
                <p>
                  You may not sell illegal items, counterfeit goods, hazardous
                  materials, or items that violate intellectual property rights.
                </p>
                {/* <p>
                  <strong>4. Platform Fees</strong>
                </p>
                <p>
                  We charge a 3.5% platform fee on each successful sale. Payment
                  processing fees may also apply.
                </p> */}
                <p>
                  <strong>4. Account Suspension</strong>
                </p>
                <p>
                  We reserve the right to suspend or terminate accounts that
                  violate our terms or engage in fraudulent activities.
                </p>
              </div>
            </ScrollArea>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreeToTerms"
                checked={watchedValues.agreeToTerms}
                onCheckedChange={(checked) =>
                  setValue("agreeToTerms", checked as boolean)
                }
              />
              <Label htmlFor="agreeToTerms" className="text-sm">
                I agree to the Terms of Service *
              </Label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-destructive mt-1">
                {errors.agreeToTerms.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Privacy Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Privacy Policy</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-52 w-full border border-border rounded-lg p-4 mb-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>1. Information Collection</strong>
                </p>
                <p>
                  We collect information you provide directly, such as account
                  details, product listings, and transaction data.
                </p>
                <p>
                  <strong>2. Information Use</strong>
                </p>
                <p>
                  We use your information to provide our services, process
                  transactions, communicate with you, and improve our platform.
                </p>
                <p>
                  <strong>3. Information Sharing</strong>
                </p>
                <p>
                  We do not sell your personal information. We may share
                  information with service providers, for legal compliance, or
                  with your consent.
                </p>
                <p>
                  <strong>4. Data Security</strong>
                </p>
                <p>
                  We implement appropriate security measures to protect your
                  information against unauthorized access, alteration,
                  disclosure, or destruction.
                </p>
                <p>
                  <strong>5. Your Rights</strong>
                </p>
                <p>
                  You have the right to access, update, or delete your personal
                  information. Contact us for assistance with these requests.
                </p>
              </div>
            </ScrollArea>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreeToPrivacy"
                checked={watchedValues.agreeToPrivacy}
                onCheckedChange={(checked) =>
                  setValue("agreeToPrivacy", checked as boolean)
                }
              />
              <Label htmlFor="agreeToPrivacy" className="text-sm">
                I agree to the Privacy Policy *
              </Label>
            </div>
            {errors.agreeToPrivacy && (
              <p className="text-sm text-destructive mt-1">
                {errors.agreeToPrivacy.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Seller Agreement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Seller Agreement</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-52 w-full border border-border rounded-lg p-4 mb-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>1. Product Quality</strong>
                </p>
                <p>
                  You agree to provide high-quality products that match your
                  descriptions and meet customer expectations.
                </p>
                <p>
                  <strong>2. Order Fulfillment</strong>
                </p>
                <p>
                  You must fulfill orders within the specified timeframe and
                  provide tracking information when available.
                </p>
                <p>
                  <strong>3. Customer Service</strong>
                </p>
                <p>
                  You agree to respond to customer inquiries promptly and
                  professionally, and handle returns and refunds according to
                  your stated policies.
                </p>
                <p>
                  <strong>4. Compliance</strong>
                </p>
                <p>
                  You must comply with all applicable laws and regulations,
                  including tax obligations and product safety requirements.
                </p>
                <p>
                  <strong>5. Performance Standards</strong>
                </p>
                <p>
                  We may monitor your performance metrics and may take action if
                  your performance falls below our standards.
                </p>
              </div>
            </ScrollArea>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreeToSeller"
                checked={watchedValues.agreeToSeller}
                onCheckedChange={(checked) =>
                  setValue("agreeToSeller", checked as boolean)
                }
              />
              <Label htmlFor="agreeToSeller" className="text-sm">
                I agree to the Seller Agreement *
              </Label>
            </div>
            {errors.agreeToSeller && (
              <p className="text-sm text-destructive mt-1">
                {errors.agreeToSeller.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Information Confirmation */}
        <Card>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirmInformation"
                checked={watchedValues.confirmInformation}
                onCheckedChange={(checked) =>
                  setValue("confirmInformation", checked as boolean)
                }
              />
              <Label htmlFor="confirmInformation" className="text-sm">
                I confirm that all information provided during onboarding is
                accurate and complete *
              </Label>
            </div>
            {errors.confirmInformation && (
              <p className="text-sm text-destructive mt-1">
                {errors.confirmInformation.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Final Notice */}
      <Alert>
        <AlertDescription>
          After submitting, your store will be reviewed by our team. This
          process typically takes 1-3 business days. You&#39;ll receive an email
          notification once your store is approved and ready to start selling.
        </AlertDescription>
      </Alert>

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
          // disabled={!isValid || isSubmitting}
          disabled={isSubmitting}
          className="bg-soraxi-green hover:bg-soraxi-green/90 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting for Review...
            </>
          ) : (
            "Submit for Review"
          )}
        </Button>
      </div>
    </form>
  );
}
