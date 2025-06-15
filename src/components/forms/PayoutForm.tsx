"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CreditCard,
  Building,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";
import type { PayoutData } from "@/types/onboarding";

/**
 * Payout Form Schema
 * Validates bank account details for payment processing
 */
const payoutFormSchema = z
  .object({
    bankName: z.string().min(2, "Bank name is required"),
    accountNumber: z
      .string()
      .min(10, "Account number must be at least 10 digits")
      .max(20, "Account number must be less than 20 digits")
      .regex(/^\d+$/, "Account number must contain only digits"),
    accountHolderName: z
      .string()
      .min(2, "Account holder name is required")
      .max(100, "Account holder name must be less than 100 characters")
      .regex(
        /^[a-zA-Z\s\-'.]+$/,
        "Account holder name can only contain letters, spaces, hyphens, apostrophes, and periods"
      ),
    bankCode: z
      .number()
      .min(1, "Bank code is required")
      .max(999999, "Invalid bank code"),
    bankId: z.number().optional(),
    confirmAccountNumber: z
      .string()
      .min(10, "Please confirm your account number"),
  })
  .refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers don't match",
    path: ["confirmAccountNumber"],
  });

type PayoutFormData = z.infer<typeof payoutFormSchema>;

interface PayoutFormProps {
  onNextAction: () => void;
  onBackAction: () => void;
}

/**
 * Common Nigerian banks with their codes
 * This would typically come from an API or database
 */
const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044", id: 1 },
  { name: "Citibank Nigeria", code: "023", id: 2 },
  { name: "Ecobank Nigeria", code: "050", id: 3 },
  { name: "Fidelity Bank", code: "070", id: 4 },
  { name: "First Bank of Nigeria", code: "011", id: 5 },
  { name: "First City Monument Bank", code: "214", id: 6 },
  { name: "Guaranty Trust Bank", code: "058", id: 7 },
  { name: "Heritage Bank", code: "030", id: 8 },
  { name: "Keystone Bank", code: "082", id: 9 },
  { name: "Polaris Bank", code: "076", id: 10 },
  { name: "Providus Bank", code: "101", id: 11 },
  { name: "Stanbic IBTC Bank", code: "221", id: 12 },
  { name: "Standard Chartered Bank", code: "068", id: 13 },
  { name: "Sterling Bank", code: "232", id: 14 },
  { name: "Union Bank of Nigeria", code: "032", id: 15 },
  { name: "United Bank For Africa", code: "033", id: 16 },
  { name: "Unity Bank", code: "215", id: 17 },
  { name: "Wema Bank", code: "035", id: 18 },
  { name: "Zenith Bank", code: "057", id: 19 },
];

/**
 * Payout Form Component
 * Fourth step of onboarding - configures bank account for payments
 */
export function PayoutForm({ onNextAction, onBackAction }: PayoutFormProps) {
  const { state, updateData, markStepCompleted } = useStoreOnboarding();
  const [selectedBank, setSelectedBank] = useState<
    (typeof NIGERIAN_BANKS)[0] | null
  >(null);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<PayoutFormData>({
    resolver: zodResolver(payoutFormSchema),
    defaultValues: state.data.payout
      ? {
          bankName: state.data.payout.bankDetails.bankName,
          accountNumber: state.data.payout.bankDetails.accountNumber,
          accountHolderName: state.data.payout.bankDetails.accountHolderName,
          bankCode: state.data.payout.bankDetails.bankCode,
          bankId: state.data.payout.bankDetails.bankId,
          confirmAccountNumber: state.data.payout.bankDetails.accountNumber,
        }
      : {
          bankName: "",
          accountNumber: "",
          accountHolderName: "",
          bankCode: 0,
          bankId: undefined,
          confirmAccountNumber: "",
        },
    mode: "onChange",
  });

  const watchedAccountNumber = watch("accountNumber");
  // const watchedBankCode = watch("bankCode");

  /**
   * Handle bank selection from dropdown
   */
  const handleBankSelect = (bank: (typeof NIGERIAN_BANKS)[0]) => {
    setSelectedBank(bank);
    setValue("bankName", bank.name);
    setValue("bankCode", Number.parseInt(bank.code));
    setValue("bankId", bank.id);
  };

  /**
   * Verify account number with bank (mock implementation)
   * In production, this would call a bank verification API
   */
  const verifyAccountNumber = async () => {
    if (!watchedAccountNumber || !selectedBank) return;

    setIsVerifying(true);
    try {
      // Mock API call - replace with actual bank verification service
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock response - in production, this would return actual account holder name
      const mockAccountHolderName = "John Doe"; // This would come from the API
      setValue("accountHolderName", mockAccountHolderName);
    } catch (error) {
      console.error("Account verification failed:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Handle form submission
   * Updates context data and proceeds to next step
   */
  const onSubmit = (data: PayoutFormData) => {
    const payoutData: PayoutData = {
      payoutMethod: "Bank Transfer",
      bankDetails: {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
        bankCode: data.bankCode,
        bankId: data.bankId,
      },
    };

    updateData("payout", payoutData);
    markStepCompleted("payout");
    onNextAction();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          Payout Account Setup
        </h2>
        <p className="text-sm text-muted-foreground">
          Add your bank account details to receive payments from sales. Your
          information is encrypted and secure.
        </p>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your banking information is encrypted and stored securely. We use
          industry-standard security measures to protect your financial data.
        </AlertDescription>
      </Alert>

      {/* Payout Method Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-soraxi-green" />
            <span>Bank Transfer</span>
          </CardTitle>
          <CardDescription>
            Receive payments directly to your bank account. Payouts are
            processed within 1-3 business days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bank Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Your Bank *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
              {NIGERIAN_BANKS.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => handleBankSelect(bank)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedBank?.code === bank.code
                      ? "border-soraxi-green bg-soraxi-green/5 text-soraxi-green"
                      : "border-border hover:border-soraxi-green/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{bank.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {bank.code}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {errors.bankName && (
              <p className="text-sm text-destructive">
                {errors.bankName.message}
              </p>
            )}
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="accountNumber" className="text-sm font-medium">
              Account Number *
            </Label>
            <div className="relative">
              <Input
                id="accountNumber"
                {...register("accountNumber")}
                type={showAccountNumber ? "text" : "password"}
                placeholder="Enter your account number"
                className={`pr-20 ${
                  errors.accountNumber ? "border-destructive" : ""
                }`}
                maxLength={20}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  {showAccountNumber ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                {selectedBank &&
                  watchedAccountNumber &&
                  watchedAccountNumber.length >= 10 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={verifyAccountNumber}
                      disabled={isVerifying}
                      className="text-xs h-6"
                    >
                      {isVerifying ? "Verifying..." : "Verify"}
                    </Button>
                  )}
              </div>
            </div>
            {errors.accountNumber && (
              <p className="text-sm text-destructive">
                {errors.accountNumber.message}
              </p>
            )}
          </div>

          {/* Confirm Account Number */}
          <div className="space-y-2">
            <Label
              htmlFor="confirmAccountNumber"
              className="text-sm font-medium"
            >
              Confirm Account Number *
            </Label>
            <Input
              id="confirmAccountNumber"
              {...register("confirmAccountNumber")}
              type={showAccountNumber ? "text" : "password"}
              placeholder="Re-enter your account number"
              className={
                errors.confirmAccountNumber ? "border-destructive" : ""
              }
              maxLength={20}
            />
            {errors.confirmAccountNumber && (
              <p className="text-sm text-destructive">
                {errors.confirmAccountNumber.message}
              </p>
            )}
          </div>

          {/* Account Holder Name */}
          <div className="space-y-2">
            <Label htmlFor="accountHolderName" className="text-sm font-medium">
              Account Holder Name *
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="accountHolderName"
                {...register("accountHolderName")}
                placeholder="Full name as it appears on your bank account"
                className={`pl-10 ${
                  errors.accountHolderName ? "border-destructive" : ""
                }`}
              />
            </div>
            {errors.accountHolderName && (
              <p className="text-sm text-destructive">
                {errors.accountHolderName.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              This must exactly match the name on your bank account for
              successful transfers
            </p>
          </div>

          {/* Hidden fields for bank code and ID */}
          <input
            type="hidden"
            {...register("bankCode", { valueAsNumber: true })}
          />
          <input
            type="hidden"
            {...register("bankId", { valueAsNumber: true })}
          />
        </CardContent>
      </Card>

      {/* Payout Information */}
      <div className="bg-soraxi-green/5 border border-soraxi-green/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-soraxi-green mb-2">
          💰 Payout Information
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Payouts are processed automatically every week on Fridays</li>
          <li>• Minimum payout amount is $10.00</li>
          <li>• Platform fee of 3.5% is deducted from each sale</li>
          <li>• Bank transfer fees may apply depending on your bank</li>
          <li>• You can track all payouts in your dashboard after setup</li>
        </ul>
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
          Continue to Terms
        </Button>
      </div>
    </form>
  );
}
