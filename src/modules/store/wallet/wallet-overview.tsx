"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Clock, Send, Eye, EyeOff } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";

/**
 * Wallet Overview Component
 *
 * Simple vendor wallet dashboard showing:
 * - Available balance (withdrawable)
 * - Pending balance (escrow)
 * - Total wallet value
 */

interface WalletOverviewProps {
  onWithdrawClickAction: (val: number) => void;
  onTransactionHistoryClickAction: () => void;
}

export function WalletOverview({
  onWithdrawClickAction,
  onTransactionHistoryClickAction,
}: WalletOverviewProps) {
  const trpc = useTRPC();
  const [balanceVisible, setBalanceVisible] = useState(true);

  const { data, refetch, isLoading } = useQuery(
    trpc.storeWallet.getWallet.queryOptions(),
  );

  const wallet = data?.wallet;

  const formatBalance = (amount: number) => {
    if (!balanceVisible) return "₦****";
    return formatNaira(amount, { showDecimals: true });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2" />
              <div className="h-3 bg-muted rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!wallet) {
    return (
      <Card className="p-8 text-center">
        <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Wallet Not Found</h3>
        <p className="text-muted-foreground">
          Unable to load wallet information
        </p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          Retry
        </Button>
      </Card>
    );
  }

  const { balances, debt } = wallet;

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Available Balance
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="h-8 w-8 p-0"
              >
                {balanceVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatBalance(balances.available)}
            </div>
            <p className="text-xs text-muted-foreground">Withdrawable funds</p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Balance
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {formatBalance(balances.pending)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>

        {/* Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatBalance(balances.total)}
            </div>
            <p className="text-xs text-muted-foreground">All wallet funds</p>
          </CardContent>
        </Card>
      </div>

      {/* Debt (minimal, optional highlight) */}
      {debt.amount > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-600">
              Outstanding Debt
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-red-600">
                {formatBalance(debt.amount)}
              </div>

              <Badge variant="destructive">
                {debt.recoveryType ?? "Active"}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              This will be deducted automatically during payouts
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => onWithdrawClickAction(balances.available)}
              className="bg-green-600 hover:bg-green-700"
              disabled={balances.available <= 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Withdraw Funds
            </Button>

            <Button variant="outline" onClick={onTransactionHistoryClickAction}>
              <TrendingUp className="w-4 h-4 mr-2" />
              View Transactions
            </Button>

            <Button variant="outline" onClick={() => refetch()}>
              Refresh Balance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
