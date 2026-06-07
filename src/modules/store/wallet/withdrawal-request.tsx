"use client";

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
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/utils/naira";
import Link from "next/link";
import { WITHDRAWAL_LIMITS } from "@/constants/financial.constants";

import { useWithdrawalRequest } from "@/hooks/use-withdrawal-request";

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
  const {
    form,
    setForm,
    errors,
    loading,
    bankAccounts,
    selectedAccount,
    setSelectedAccount,
    isLoadingAccounts,
    amountInKobo,
    fees,
    showConfirmation,
    setShowConfirmation,
    submitForm,
    processWithdrawal,
  } = useWithdrawalRequest({
    availableBalance,
    onWithdrawalSuccessAction,
    onCloseAction,
  });

  return (
    <>
      {/* Main Withdrawal Form Card */}
      <div className="w-full max-w-4xl mx-auto bg-background">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between flex-wrap">
            <h2 className="text-lg font-semibold">Request Withdrawal</h2>

            <span className="text-sm text-muted-foreground">
              Available Balance:{" "}
              {formatNaira(availableBalance, { showDecimals: true })}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitForm();
            }}
            className="space-y-6"
          >
            {/* Withdrawal Amount */}
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
                  setForm((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
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

              <p className="text-xs text-muted-foreground">
                Minimum:{" "}
                {formatNaira(WITHDRAWAL_LIMITS.MINIMUM_WITHDRAWAL, {
                  showDecimals: true,
                })}{" "}
                • Maximum:{" "}
                {formatNaira(WITHDRAWAL_LIMITS.MAXIMUM_WITHDRAWAL, {
                  showDecimals: true,
                })}
              </p>
            </div>

            {/* Store Password */}
            <div className="space-y-2">
              <Label htmlFor="storePassword">Store Password</Label>

              <Input
                id="storePassword"
                type="password"
                placeholder="Authenticate this request with your store password"
                value={form.storePassword}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    storePassword: e.target.value,
                  }))
                }
                className={errors.storePassword ? "border-red-500" : ""}
              />

              {errors.storePassword && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.storePassword}
                </p>
              )}
            </div>

            {/* Bank Accounts */}
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
                      isSelected={selectedAccount?.id === account.id}
                      onSelect={() => {
                        setSelectedAccount(account);
                        setForm((prev) => ({
                          ...prev,
                          accountId: account.id,
                        }));
                      }}
                    />
                  ))}
                </div>
              )}

              {errors.accountId && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.accountId}
                </p>
              )}
            </div>

            {/* Fee Breakdown */}
            {fees && amountInKobo >= WITHDRAWAL_LIMITS.MINIMUM_WITHDRAWAL && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <h4 className="font-medium mb-3">Transaction Summary</h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Withdrawal Amount:</span>
                    <span>
                      {formatNaira(amountInKobo, {
                        showDecimals: true,
                      })}
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
                      -
                      {formatNaira(fees.fixedFee, {
                        showDecimals: true,
                      })}
                    </span>
                  </div>

                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Net Amount:</span>
                    <span className="text-green-600">
                      {formatNaira(fees.netAmount, {
                        showDecimals: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
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
        </div>
      </div>

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
          : "",
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
