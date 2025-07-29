"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Banknote,
  CreditCard,
  ShieldIcon,
  EyeOff,
  Eye,
  UserIcon,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bank } from "@/modules/server/store/payout-account/procedures";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

/**
 * Component for managing and updating payout accounts
 * Allows users to add new bank accounts and view existing ones
 */
const UpdatePayoutAccount = ({ storeId }: { storeId: string }) => {
  // State management
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const trpc = useTRPC();

  const { data: payoutAccounts } = useQuery(
    trpc.payment.getStorePayoutAccounts.queryOptions()
  );
  const { data: banks, isLoading } = useQuery(
    trpc.payment.getBanks.queryOptions()
  );

  const resolveAccountMutation = useMutation(
    trpc.payment.resolveAccountNumber.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          `Account Verified. Account Name: ${data.data.account_name}`
        );
        setAccountHolderName(data.data.account_name);
        setIsValidating(false);
      },
      onError: () => {
        toast.error("Invalid account number. Please check and try again.");
        setIsValidating(false);
      },
    })
  );

  const addPayoutAccount = useMutation(
    trpc.payment.addPayoutAccount.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Success, ${data.message}`);
        setIsValidating(false);
      },
      onError: () => {
        toast.error("Failed to add payout account. Please try again.");
        setIsValidating(false);
      },
    })
  );

  /**
   * Handle form submission for new payout account
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBank) {
      toast.error("Bank not selected.");
      console.error("Bank not selected");
      return;
    }

    setIsSubmitting(true);

    addPayoutAccount.mutate({
      storeId,
      payoutMethod: "Bank Transfer",
      bankDetails: {
        bankName: selectedBank.name,
        accountNumber,
        accountHolderName,
        bankCode: Number(selectedBank.code),
        bankId: selectedBank.id,
      },
    });
  };

  /**
   * Validate account number against selected bank
   */
  const validateAccountNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank?.code || accountNumber.length !== 10) return;

    setIsValidating(true);
    resolveAccountMutation.mutate({
      accountNumber: Number(accountNumber),
      bankCode: Number(selectedBank.code),
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        <Skeleton className="h-9 w-64 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      {/* Security Notice */}
      <Alert>
        <ShieldIcon className="h-4 w-4" />
        <AlertDescription>
          Your banking information is encrypted and stored securely. We use
          industry-standard security measures to protect your financial data.
        </AlertDescription>
      </Alert>
      {/* Existing Accounts Section */}
      <section className="space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6" />
          Payout Accounts
        </h1>

        {payoutAccounts && payoutAccounts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {payoutAccounts.map((account, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <h3 className="font-semibold">
                    {account.bankDetails.bankName}
                  </h3>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-sm font-mono">
                    {account.bankDetails.accountNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {account.bankDetails.accountHolderName}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>No payout accounts found</AlertDescription>
          </Alert>
        )}
      </section>

      {/* Add Account Form */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6" />
          Add New Account
        </h2>

        {banks && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                Payout Account Setup
              </h2>
              <p className="text-sm text-muted-foreground">
                Add your bank account details to receive payments from sales.
                Your information is encrypted and secure.
              </p>
            </div>

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
                  <Label className="text-sm font-medium">
                    Select Your Bank *
                  </Label>
                  <Select
                    onValueChange={(value) => {
                      const bank = banks.find((b) => b.name === value);
                      setSelectedBank(bank || null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem
                          key={bank.id}
                          value={bank.name}
                          className={`rounded-lg transition-colors ${
                            selectedBank?.code === bank.code
                              ? "border border-soraxi-green bg-soraxi-green/5 text-soraxi-green"
                              : "hover:border hover:border-soraxi-green/50 hover:bg-muted/50"
                          }`}
                          onClick={validateAccountNumber}
                        >
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Number */}
                <div className="space-y-2">
                  <Label
                    htmlFor="accountNumber"
                    className="text-sm font-medium"
                  >
                    Account Number *
                  </Label>
                  <div className="relative">
                    <Input
                      id="accountNumber"
                      type={showAccountNumber ? "text" : "password"}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      onKeyUp={validateAccountNumber}
                      placeholder="10-digit account number"
                      pattern="\d{10}"
                      maxLength={10}
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
                    </div>
                  </div>
                </div>

                {/* Account Holder Name */}
                <div className="space-y-2">
                  <Label
                    htmlFor="accountHolderName"
                    className="text-sm font-medium"
                  >
                    Account Holder Name *
                  </Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="accountHolderName"
                      type="text"
                      value={accountHolderName}
                      onChange={(e) =>
                        setAccountHolderName(e.target.value.toUpperCase())
                      }
                      readOnly
                      className="bg-muted pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This must exactly match the name on your bank account for
                    successful transfers
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payout Information */}
            <div className="bg-soraxi-green/5 border border-soraxi-green/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-soraxi-green mb-2">
                💰 Payout Information
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • Payouts are processed automatically every week on Fridays
                </li>
                <li>• Minimum payout amount is $10.00</li>
                <li>• Platform fee of 3.5% is deducted from each sale</li>
                <li>• Bank transfer fees may apply depending on your bank</li>
                <li>
                  • You can track all payouts in your dashboard after setup
                </li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between pt-6 border-t border-border">
              <Button
                type="submit"
                disabled={isSubmitting || isValidating || !accountHolderName}
                className="bg-soraxi-green hover:bg-soraxi-green/90 text-white"
              >
                {isSubmitting || isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isValidating ? "Validating..." : "Submitting..."}
                  </>
                ) : (
                  "Add Account"
                )}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default UpdatePayoutAccount;
