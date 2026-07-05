"use client";

import { useRef, useState, useCallback } from "react";
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
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Loader2,
  ArrowDown,
} from "lucide-react";
import { useStoreOnboarding } from "@/contexts/store-onboarding-context";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Terms Form Schema
 * Validates agreement to the Soraxi Vendor Onboarding Agreement
 */
const termsFormSchema = z.object({
  agreeToVendorAgreement: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Vendor Onboarding Agreement to continue",
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
 * Final step of onboarding - agreement to the Vendor Onboarding Agreement and submission
 */

export function TermsForm({ onBackAction }: TermsFormProps) {
  const { state, updateData, markStepCompleted, saveDraft } =
    useStoreOnboarding();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tracks whether the vendor has scrolled the agreement to the bottom.
  // The agreement checkbox stays disabled until this is true.
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TermsFormData>({
    resolver: zodResolver(termsFormSchema),
    defaultValues: {
      agreeToVendorAgreement: false,
      confirmInformation: false,
    },
    mode: "onChange",
  });

  const watchedValues = watch();

  /**
   * Detects when the vendor has scrolled the agreement panel to (or near) the
   * bottom. A small threshold accounts for rounding/sub-pixel scroll values.
   */
  const handleAgreementScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (hasReachedEnd) return;
      const target = event.currentTarget;
      const threshold = 24; // px
      const reachedBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight <=
        threshold;
      if (reachedBottom) {
        setHasReachedEnd(true);
      }
    },
    [hasReachedEnd],
  );

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
        `Your store has been submitted for review. You'll be notified once it's approved.`,
      );

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
          Please review and agree to our Vendor Onboarding Agreement to complete
          your store setup. Your store will be submitted for review after this
          step.
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

      {/* Vendor Onboarding Agreement */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Vendor Onboarding Agreement</span>
            </CardTitle>
            <CardDescription>
              {hasReachedEnd
                ? "You've reached the end of the agreement."
                : "Scroll to the end to unlock the agreement checkbox."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <div
                ref={viewportRef}
                onScroll={handleAgreementScroll}
                tabIndex={0}
                role="region"
                aria-label="Vendor Onboarding Agreement"
                className="h-80 w-full overflow-y-auto border border-border rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="text-sm text-muted-foreground space-y-3 pr-2">
                  <p>
                    This Vendor Onboarding Agreement (&#x201C;Agreement&#x201D;)
                    is entered into between Soraxi (&#x201C;Soraxi,&#x201D;
                    &#x201C;the Platform,&#x201D; &#x201C;we,&#x201D; or
                    &#x201C;us&#x201D;), a campus-focused multi-vendor
                    marketplace operating in Nigerian tertiary institutions, and
                    the individual or business creating a vendor storefront on
                    the Platform (&#x201C;Vendor,&#x201D; &#x201C;you,&#x201D;
                    or &#x201C;your&#x201D;).
                  </p>
                  <p>
                    By checking the acceptance box and creating a storefront on
                    Soraxi, you confirm that you have read, understood, and
                    agree to be bound by the terms of this Agreement.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    1. Eligibility and Storefront Creation
                  </p>
                  <p>
                    To create a storefront on Soraxi, you must be able to
                    receive payouts to a valid Nigerian bank account, provide
                    accurate business and contact information, and comply with
                    all applicable Nigerian laws governing the sale of your
                    goods or services. Soraxi reserves the right to verify the
                    information you provide and to decline or revoke storefront
                    access where verification fails or information is found to
                    be false or misleading.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    2. Product Listings
                  </p>
                  <p>
                    You are solely responsible for the accuracy of every product
                    or service you list on Soraxi, including price, description,
                    availability, and condition. Listings must not be
                    misleading, must not infringe on any third party&#x2019;s
                    intellectual property, and must comply with Soraxi&#x2019;s
                    content guidelines as published from time to time.
                  </p>
                  <p>
                    Soraxi may use your submitted listing information, including
                    AI-assisted formatting of your input, to generate structured
                    listing pages. You remain responsible for reviewing and
                    confirming the accuracy of any such generated listing before
                    it goes live.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    3. Order Fulfilment
                  </p>
                  <p>
                    Soraxi operates a hybrid fulfilment model. Depending on the
                    arrangement applicable to your storefront, you will either
                    fulfil and deliver orders directly and update order status
                    accordingly (&#x201C;Vendor-Fulfilled&#x201D;), or Soraxi
                    will manage delivery on your behalf
                    (&#x201C;Platform-Fulfilled&#x201D;).
                  </p>
                  <p>
                    You agree to update order status promptly and accurately,
                    and to make a genuine attempt to deliver every confirmed
                    order. Failure to attempt delivery, or repeated failed
                    deliveries, may result in commission and payout consequences
                    as set out below, and may affect your standing on the
                    Platform.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    4. Commission and Fees
                  </p>
                  <p>
                    Soraxi charges a commission on each completed sale,
                    calculated per order at the rates published in your vendor
                    dashboard. Soraxi may also charge processing fees on payout
                    withdrawals, also published in your vendor dashboard. These
                    rates may be updated from time to time; the rates in effect
                    at the time of a transaction are the rates that apply to
                    that transaction.
                  </p>
                  <p>
                    Funds owed to you from a sale are held by Soraxi and
                    released to your available balance once the order is
                    confirmed as delivered, in line with the Platform&#x2019;s
                    order confirmation process (including automatic confirmation
                    after a set period if you do not respond).
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    5. Refunds, Cancellations, and Commission Treatment
                  </p>
                  <p>
                    Where an order is cancelled before it is shipped, the full
                    amount paid by the student, including commission, is
                    reversed and refunded. Where you attempt delivery but the
                    delivery fails, your settlement amount is refunded to the
                    student but Soraxi&#x2019;s commission is retained, as you
                    made a genuine delivery attempt. Where an order is
                    successfully delivered and confirmed, commission is retained
                    in full.
                  </p>
                  <p>
                    All refunds are paid to the student&#x2019;s original
                    payment method. Soraxi does not offer wallet or store credit
                    as a refund mechanism.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    6. Disputes
                  </p>
                  <p>
                    A student may raise a dispute on a delivered order within
                    the window stated on the Platform, supported by a written
                    description and evidence. Once a dispute is opened, the
                    relevant funds in your wallet are frozen pending review.
                  </p>
                  <p>
                    Soraxi&#x2019;s team will review the dispute and rule in
                    favour of either you or the student. If the dispute is
                    upheld in the student&#x2019;s favour, the frozen funds are
                    refunded to the student and a penalty may be deducted from
                    your available balance. If the dispute is rejected, the
                    frozen funds are released back to your available balance and
                    no penalty applies.
                  </p>
                  <p>
                    If Soraxi fails to resolve a dispute within its stated
                    review window, the dispute will be automatically resolved in
                    the student&#x2019;s favour as a platform safeguard. In this
                    case only, no penalty is applied to you, as the delay is not
                    attributable to you.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    7. Outstanding Balances
                  </p>
                  <p>
                    Where a penalty or other deduction exceeds your available
                    balance, the shortfall is recorded as an outstanding balance
                    owed to Soraxi. Soraxi may recover this balance either by
                    withholding a percentage of your future payouts until it is
                    cleared, or by blocking further payouts entirely until the
                    full amount is repaid, depending on the circumstances and
                    amount involved.
                  </p>

                  <p className="font-medium text-foreground pt-2">8. Payouts</p>
                  <p>
                    You may request a payout of your available balance at any
                    time, subject to your storefront being in good standing and
                    free of a full payout block under Clause 7. Payouts are
                    subject to the processing fees published in your vendor
                    dashboard and are paid to the bank account details you
                    provide. You are responsible for ensuring your bank details
                    are accurate; Soraxi is not liable for funds misdirected due
                    to incorrect details you supplied.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    9. Vendor Conduct and Breach
                  </p>
                  <p>
                    You agree to act honestly and in good faith in your dealings
                    with students and with Soraxi. Without limitation, the
                    following constitute a breach of this Agreement: listing
                    counterfeit, prohibited, or misleading items; repeated
                    failure to fulfil confirmed orders; manipulating or
                    attempting to manipulate disputes, reviews, or payouts; and
                    any conduct that exposes students or the Platform to harm,
                    fraud, or legal risk.
                  </p>
                  <p>
                    Where you act contrary to this Agreement or to
                    Soraxi&#x2019;s published policies, Soraxi may, depending on
                    the severity of the breach, issue a warning, suspend your
                    storefront, withhold affected funds pending investigation,
                    or terminate your access to the Platform. Soraxi will act
                    reasonably and proportionately, but reserves the right to
                    act immediately where necessary to protect students or the
                    Platform from harm.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    10. Termination and Exit
                  </p>
                  <p>
                    You may close your storefront and exit the Platform at any
                    time by providing Soraxi with at least two (2) weeks&#x2019;
                    written notice.
                  </p>
                  <p>
                    On exit, any funds held in pending or disputed status at the
                    time of your notice will not be released until those orders
                    or disputes are resolved and you have formally cleared all
                    outstanding obligations to Soraxi, including any outstanding
                    balance under Clause 7. Once all obligations are cleared,
                    your remaining available balance will be paid out to you in
                    line with Clause 8.
                  </p>
                  <p>
                    Soraxi may also suspend or terminate your access to the
                    Platform for breach of this Agreement as set out in Clause
                    9, or where required by law or regulatory direction.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    11. Data and Confidentiality
                  </p>
                  <p>
                    You consent to Soraxi processing your business and personal
                    information as necessary to operate your storefront, process
                    payments and payouts, and comply with applicable law. Soraxi
                    will not sell your personal data to third parties. Any
                    non-public information you receive about Soraxi&#x2019;s
                    systems, policies, or other vendors in the course of this
                    relationship must be kept confidential.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    12. Limitation of Liability
                  </p>
                  <p>
                    Soraxi provides the Platform as a marketplace connecting
                    vendors and students and is not a party to the underlying
                    sale of goods or services between you and any student. To
                    the extent permitted by law, Soraxi&#x2019;s liability to
                    you arising from this Agreement is limited to the commission
                    retained by Soraxi on the specific transaction giving rise
                    to the claim.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    13. Governing Law
                  </p>
                  <p>
                    This Agreement is governed by the laws of the Federal
                    Republic of Nigeria. Any dispute arising from this Agreement
                    that cannot be resolved through Soraxi&#x2019;s internal
                    dispute process will be subject to the exclusive
                    jurisdiction of the courts of Nigeria.
                  </p>

                  <p className="font-medium text-foreground pt-2">
                    14. Amendments
                  </p>
                  <p>
                    Soraxi may update this Agreement and its related policies
                    (including commission and fee rates) from time to time.
                    Material changes will be communicated through the vendor
                    dashboard or by email. Your continued use of the Platform
                    after a change takes effect constitutes acceptance of the
                    updated terms.
                  </p>

                  <p className="pt-2 pb-1 text-xs text-muted-foreground/70">
                    End of agreement.
                  </p>
                </div>
              </div>

              {/* Scroll prompt, fades out once the bottom is reached */}
              {!hasReachedEnd && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-center rounded-b-lg bg-gradient-to-t from-background via-background/80 to-transparent pb-2 pt-8">
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <ArrowDown className="w-3 h-3 animate-bounce" />
                    Scroll to read the full agreement
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="agreeToVendorAgreement"
                checked={watchedValues.agreeToVendorAgreement}
                disabled={!hasReachedEnd}
                onCheckedChange={(checked) =>
                  setValue("agreeToVendorAgreement", checked as boolean, {
                    shouldValidate: true,
                  })
                }
              />
              <Label
                htmlFor="agreeToVendorAgreement"
                className={`text-sm ${
                  !hasReachedEnd ? "text-muted-foreground" : ""
                }`}
              >
                I agree to the Vendor Onboarding Agreement *
              </Label>
            </div>
            {!hasReachedEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                Please scroll to the end of the agreement to enable this
                checkbox.
              </p>
            )}
            {errors.agreeToVendorAgreement && (
              <p className="text-sm text-destructive mt-1">
                {errors.agreeToVendorAgreement.message}
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
                  setValue("confirmInformation", checked as boolean, {
                    shouldValidate: true,
                  })
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
      <div className="flex flex-col gap-3 sm:flex-row justify-between pt-6 border-t border-border">
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
