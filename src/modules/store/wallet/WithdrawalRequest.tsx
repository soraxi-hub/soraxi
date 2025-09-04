"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/utils/naira";
import { toast } from "sonner";
import Link from "next/link";

/**
 * Type definitions for the component
 */
type Output = inferProcedureOutput<
  AppRouter["payment"]["getStorePayoutAccounts"]
>;
type BankAccount = Output[number];

interface WithdrawalRequestProps {
  availableBalance: number;
  onWithdrawalSuccessAction: () => void;
  onCloseAction: () => void;
  storeId: string;
}

interface WithdrawalForm {
  amount: string;
  bankAccountId: string;
  description: string;
}

/**
 * WithdrawalRequest Component
 *
 * A comprehensive withdrawal request form that handles:
 * - Bank account selection from verified payout accounts
 * - Amount validation against available balance
 * - Fee calculation and transparent breakdown
 * - Confirmation dialog with transaction summary
 * - Integration with backend via TRPC
 */
export function WithdrawalRequest({
  availableBalance,
  onWithdrawalSuccessAction,
  onCloseAction,
  storeId,
}: WithdrawalRequestProps) {
  const trpc = useTRPC();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null
  );
  const [form, setForm] = useState<WithdrawalForm>({
    amount: "",
    bankAccountId: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<Partial<WithdrawalForm>>({});

  // Withdrawal configuration constants
  const MINIMUM_WITHDRAWAL = 100000; // ₦1,000 in kobo (100 kobo = ₦1)
  const MAXIMUM_WITHDRAWAL = 10000000; // ₦100,000 in kobo
  const PROCESSING_FEE_RATE = 0.015; // 1.5% variable fee
  const FIXED_FEE = 5000; // ₦50 fixed fee in kobo

  /**
   * Fetch payout accounts using TRPC query
   * Automatically handles loading states and errors
   */
  const { data: payoutAccounts, isLoading: isLoadingAccounts } = useQuery(
    trpc.payment.getStorePayoutAccounts.queryOptions()
  );

  const createWithdrawalRequest = useMutation(
    trpc.withdrawal.createWithdrawalRequest.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "An unknown Error occurred"
        );
      },
    })
  );

  useEffect(() => {
    // Auto-select the first account if available
    if (payoutAccounts && payoutAccounts.length > 0) {
      setSelectedAccount(payoutAccounts[0]);
      setBankAccounts(payoutAccounts);
      setForm((prev) => ({
        ...prev,
        bankAccountId: payoutAccounts[0].bankDetails.accountNumber,
      }));
    }
  }, [payoutAccounts]);

  // console.log(payoutAccounts)

  /**
   * Calculate processing fees for a given amount
   * @param amountInKobo - The withdrawal amount in kobo
   * @returns Object containing fee breakdown and net amount
   */
  const calculateFees = (amountInKobo: number) => {
    const percentageFee = Math.round(amountInKobo * PROCESSING_FEE_RATE);
    const totalFee = percentageFee + FIXED_FEE;
    return {
      percentageFee,
      fixedFee: FIXED_FEE,
      totalFee,
      netAmount: amountInKobo - totalFee,
    };
  };

  /**
   * Validate withdrawal form fields
   * @returns boolean - true if form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<WithdrawalForm> = {};
    const amountInKobo = Math.round(
      Number.parseFloat(form.amount || "0") * 100
    );

    // Amount validation
    if (!form.amount || Number.parseFloat(form.amount) <= 0) {
      newErrors.amount = "Amount is required";
    } else if (amountInKobo < MINIMUM_WITHDRAWAL) {
      newErrors.amount = `Minimum withdrawal is ${formatNaira(
        MINIMUM_WITHDRAWAL,
        { showDecimals: true }
      )}`;
    } else if (amountInKobo > MAXIMUM_WITHDRAWAL) {
      newErrors.amount = `Maximum withdrawal is ${formatNaira(
        MAXIMUM_WITHDRAWAL,
        { showDecimals: true }
      )}`;
    } else if (amountInKobo > availableBalance) {
      newErrors.amount = "Amount exceeds available balance";
    }

    // Bank account validation
    if (!form.bankAccountId) {
      newErrors.bankAccountId = "Please select a bank account";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   * Validates form and shows confirmation dialog if valid
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  /**
   * Process withdrawal request
   * Submits validated withdrawal to backend API
   */
  const processWithdrawal = async () => {
    try {
      setLoading(true);
      const amountInKobo = Math.round(Number.parseFloat(form.amount) * 100);

      createWithdrawalRequest.mutate({
        amount: amountInKobo,
        bankAccountId: form.bankAccountId,
        description: form.description,
      });

      onWithdrawalSuccessAction();
      onCloseAction();
    } catch (error) {
      console.error("Withdrawal error:", error);
      // TODO: Add toast notification for error
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  // Calculate fees whenever amount changes
  const amountInKobo = Math.round(Number.parseFloat(form.amount || "0") * 100);
  const fees = amountInKobo > 0 ? calculateFees(amountInKobo) : null;

  return (
    <>
      {/* Main Withdrawal Form Card */}
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="w-5 h-5 mr-2" />
            Request Withdrawal
          </CardTitle>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Available Balance:{" "}
              {formatNaira(availableBalance, { showDecimals: true })}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Withdrawal Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                step="500"
                min="1000"
                placeholder="Enter amount"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className={errors.amount ? "border-red-500" : ""}
                disabled={isLoadingAccounts}
              />
              {errors.amount && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.amount}
                </p>
              )}
              <div className="text-xs text-muted-foreground">
                Minimum:{" "}
                {formatNaira(MINIMUM_WITHDRAWAL, { showDecimals: true })} •
                Maximum:{" "}
                {formatNaira(MAXIMUM_WITHDRAWAL, { showDecimals: true })}
              </div>
            </div>

            {/* Bank Account Selection */}
            <div className="space-y-2">
              <Label>Select Bank Account</Label>
              {isLoadingAccounts ? (
                <div className="p-4 border rounded-lg text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Loading bank accounts...
                  </p>
                </div>
              ) : bankAccounts.length === 0 ? (
                <div className="p-4 border rounded-lg text-center">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No verified bank accounts found
                  </p>
                  <Button variant="link" size="sm" className="mt-2" asChild>
                    <Link href={`/store/${storeId}/payment-setup`}>
                      Add Bank Account
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {bankAccounts.map((account) => (
                    <AccountCard
                      key={account.bankDetails.accountNumber}
                      account={account}
                      isSelected={
                        selectedAccount?.bankDetails.accountNumber ===
                        account.bankDetails.accountNumber
                      }
                      onSelect={() => {
                        setSelectedAccount(account);
                        setForm((prev) => ({
                          ...prev,
                          bankAccountId: account.bankDetails.accountNumber,
                        }));
                      }}
                    />
                  ))}
                </div>
              )}
              {errors.bankAccountId && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.bankAccountId}
                </p>
              )}
            </div>

            {/* Optional Description */}
            {/* <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a note about this withdrawal"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div> */}

            {/* Fee Breakdown */}
            {fees && amountInKobo >= MINIMUM_WITHDRAWAL && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3">Transaction Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Withdrawal Amount:</span>
                      <span>
                        {formatNaira(amountInKobo, { showDecimals: true })}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Processing Fee (1.5%):</span>
                      <span>
                        -
                        {formatNaira(fees.percentageFee, {
                          showDecimals: true,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Fixed Fee:</span>
                      <span>
                        -{formatNaira(fees.fixedFee, { showDecimals: true })}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Net Amount:</span>
                      <span className="text-green-600">
                        {formatNaira(fees.netAmount, { showDecimals: true })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form Actions */}
            <div className="flex space-x-3">
              <Button
                type="submit"
                className="flex-1 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
                disabled={
                  loading || bankAccounts.length === 0 || isLoadingAccounts
                }
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Request Withdrawal
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={onCloseAction}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal</DialogTitle>
            <DialogDescription>
              Please review your withdrawal details before proceeding.
            </DialogDescription>
          </DialogHeader>

          {selectedAccount && fees && (
            <div className="space-y-4">
              {/* Bank Account Summary */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Bank Account</h4>
                <p className="text-sm">
                  {selectedAccount.bankDetails.bankName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedAccount.bankDetails.accountHolderName} •{" "}
                  {selectedAccount.bankDetails.accountNumber}
                </p>
              </div>

              {/* Transaction Details */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Transaction Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Withdrawal Amount:</span>
                    <span>
                      {formatNaira(amountInKobo, { showDecimals: true })}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Fees:</span>
                    <span>
                      -{formatNaira(fees.totalFee, { showDecimals: true })}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium pt-1 border-t">
                    <span>Net Amount:</span>
                    <span className="text-green-600">
                      {formatNaira(fees.netAmount, { showDecimals: true })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Processing Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Withdrawals are processed weekly
                  between Friday and Sunday after a request is made. You will
                  receive a confirmation email once your payout has been
                  completed.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={processWithdrawal}
              className="bg-soraxi-green text-white hover:bg-soraxi-green-hover"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Withdrawal"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * AccountCard Component
 *
 * Reusable component for displaying bank account information
 * with selection state and click handler.
 */
function AccountCard({
  account,
  isSelected,
  onSelect,
}: {
  account: BankAccount;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      onClick={onSelect}
      className={cn(
        "cursor-pointer transition-all hover:border-soraxi-green",
        isSelected
          ? "border-2 border-soraxi-green dark:border-soraxi-green"
          : ""
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {account.bankDetails.accountHolderName}
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {account.bankDetails.bankName}
        </span>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-sm">{account.bankDetails.accountNumber}</p>
        <div className="flex items-center mt-2">
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
