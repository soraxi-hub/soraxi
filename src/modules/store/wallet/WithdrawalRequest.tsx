"use client";

import type React from "react";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  X,
} from "lucide-react";

/**
 * Withdrawal Request Component
 *
 * Handles withdrawal requests from store wallet to bank account.
 * Provides comprehensive form validation, bank account verification,
 * and withdrawal processing with professional UI/UX.
 *
 * Features:
 * - Amount validation with minimum/maximum limits
 * - Bank account selection and verification
 * - Processing fee calculation and display
 * - Confirmation dialog with transaction summary
 * - Real-time form validation and error handling
 * - Professional withdrawal flow with status updates
 */

interface BankAccount {
  _id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  bankCode: number;
  isVerified: boolean;
}

interface WithdrawalRequestProps {
  availableBalance: number;
  onWithdrawalSuccess: () => void;
  onClose: () => void;
}

interface WithdrawalForm {
  amount: string;
  bankAccountId: string;
  description: string;
}

export function WithdrawalRequest({
  availableBalance,
  onWithdrawalSuccess,
  onClose,
}: WithdrawalRequestProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [form, setForm] = useState<WithdrawalForm>({
    amount: "",
    bankAccountId: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errors, setErrors] = useState<Partial<WithdrawalForm>>({});

  // Withdrawal configuration
  const MINIMUM_WITHDRAWAL = 100000; // ₦1,000 in kobo
  const MAXIMUM_WITHDRAWAL = 10000000; // ₦100,000 in kobo
  const PROCESSING_FEE_RATE = 0.015; // 1.5%
  const FIXED_FEE = 5000; // ₦50 in kobo

  /**
   * Load bank accounts for withdrawal
   * Fetches verified bank accounts from store profile
   */
  const loadBankAccounts = async () => {
    try {
      const response = await fetch("/api/store/profile/bank-accounts");
      const data = await response.json();

      if (response.ok) {
        setBankAccounts(
          data.bankAccounts.filter((account: BankAccount) => account.isVerified)
        );
      }
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to load bank accounts",
      //   variant: "destructive",
      // })
    }
  };

  /**
   * Calculate processing fees
   * Returns total fees for withdrawal amount
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
   * Format currency from kobo to naira
   */
  const formatCurrency = (amountInKobo: number) => {
    const amountInNaira = amountInKobo / 100;
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amountInNaira);
  };

  /**
   * Validate withdrawal form
   * Comprehensive validation for all form fields
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
      newErrors.amount = `Minimum withdrawal is ${formatCurrency(
        MINIMUM_WITHDRAWAL
      )}`;
    } else if (amountInKobo > MAXIMUM_WITHDRAWAL) {
      newErrors.amount = `Maximum withdrawal is ${formatCurrency(
        MAXIMUM_WITHDRAWAL
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
   * Validates form and shows confirmation dialog
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await loadBankAccounts();
    setShowConfirmation(true);
  };

  /**
   * Process withdrawal request
   * Submits withdrawal to API and handles response
   */
  const processWithdrawal = async () => {
    try {
      setLoading(true);

      const amountInKobo = Math.round(Number.parseFloat(form.amount) * 100);
      const fees = calculateFees(amountInKobo);

      const response = await fetch("/api/store/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountInKobo,
          bankAccountId: form.bankAccountId,
          description: form.description,
          fees: fees,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // toast({
        //   title: "Success",
        //   description: "Withdrawal request submitted successfully",
        // })
        onWithdrawalSuccess();
        onClose();
      } else {
        throw new Error(data.error || "Withdrawal failed");
      }
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: error instanceof Error ? error.message : "Withdrawal failed",
      //   variant: "destructive",
      // })
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const selectedBankAccount = bankAccounts.find(
    (account) => account._id === form.bankAccountId
  );
  const amountInKobo = Math.round(Number.parseFloat(form.amount || "0") * 100);
  const fees = amountInKobo > 0 ? calculateFees(amountInKobo) : null;

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Send className="w-5 h-5 mr-2" />
            Request Withdrawal
          </CardTitle>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Available Balance: {formatCurrency(availableBalance)}
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Withdrawal Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.amount}
                </p>
              )}
              <div className="text-xs text-muted-foreground">
                Minimum: {formatCurrency(MINIMUM_WITHDRAWAL)} • Maximum:{" "}
                {formatCurrency(MAXIMUM_WITHDRAWAL)}
              </div>
            </div>

            {/* Bank Account Selection */}
            <div className="space-y-2">
              <Label>Select Bank Account</Label>
              {bankAccounts.length === 0 ? (
                <div className="p-4 border rounded-lg text-center">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No verified bank accounts found
                  </p>
                  <Button variant="link" size="sm" className="mt-2">
                    Add Bank Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {bankAccounts.map((account) => (
                    <div
                      key={account._id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        form.bankAccountId === account._id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          bankAccountId: account._id,
                        }))
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{account.bankName}</p>
                          <p className="text-sm text-muted-foreground">
                            {account.accountHolderName} • ****
                            {account.accountNumber.slice(-4)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {account.isVerified && (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {form.bankAccountId === account._id && (
                            <div className="w-4 h-4 rounded-full bg-primary"></div>
                          )}
                        </div>
                      </div>
                    </div>
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a note for this withdrawal..."
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>

            {/* Fee Breakdown */}
            {fees && amountInKobo >= MINIMUM_WITHDRAWAL && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3">Transaction Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Withdrawal Amount:</span>
                      <span>{formatCurrency(amountInKobo)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Processing Fee (1.5%):</span>
                      <span>-{formatCurrency(fees.percentageFee)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Fixed Fee:</span>
                      <span>-{formatCurrency(fees.fixedFee)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Net Amount:</span>
                      <span className="text-green-600">
                        {formatCurrency(fees.netAmount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex space-x-3">
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || bankAccounts.length === 0}
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
              <Button type="button" variant="outline" onClick={onClose}>
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

          {selectedBankAccount && fees && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Bank Account</h4>
                <p className="text-sm">{selectedBankAccount.bankName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedBankAccount.accountHolderName} •{" "}
                  {selectedBankAccount.accountNumber}
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Transaction Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Withdrawal Amount:</span>
                    <span>{formatCurrency(amountInKobo)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Fees:</span>
                    <span>-{formatCurrency(fees.totalFee)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-1 border-t">
                    <span>Net Amount:</span>
                    <span className="text-green-600">
                      {formatCurrency(fees.netAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {form.description && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm">{form.description}</p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Withdrawal processing typically takes
                  1-3 business days. You will receive a confirmation email once
                  the transfer is completed.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
            >
              Cancel
            </Button>
            <Button onClick={processWithdrawal} disabled={loading}>
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
