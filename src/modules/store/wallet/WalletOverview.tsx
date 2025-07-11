"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  TrendingUp,
  Clock,
  Download,
  Send,
  Eye,
  EyeOff,
} from "lucide-react";

/**
 * Wallet Overview Component
 *
 * Displays the store's wallet balance, pending amounts, and total earnings
 * with professional financial formatting and interactive features.
 *
 * Features:
 * - Real-time balance display with currency formatting
 * - Balance visibility toggle for privacy
 * - Quick action buttons for withdrawals and statements
 * - Responsive design with professional styling
 * - Loading states and error handling
 */

interface WalletData {
  _id: string;
  store: string;
  balance: number;
  pending: number;
  totalEarned: number;
  currency: string;
  updatedAt: string;
  createdAt: string;
}

interface WalletOverviewProps {
  onWithdrawClick: () => void;
  onTransactionHistoryClick: () => void;
}

export function WalletOverview({
  onWithdrawClick,
  onTransactionHistoryClick,
}: WalletOverviewProps) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  /**
   * Load wallet data from API
   * Fetches current wallet information including balance, pending, and total earned
   */
  const loadWalletData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/store/wallet");
      const data = await response.json();

      if (response.ok) {
        setWalletData(data.wallet);
      } else {
        throw new Error(data.error || "Failed to load wallet data");
      }
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: error instanceof Error ? error.message : "Failed to load wallet data",
      //   variant: "destructive",
      // })
    } finally {
      setLoading(false);
    }
  };

  /**
   * Format currency amount from kobo to naira
   * Converts stored kobo values to user-friendly naira display
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
   * Format balance with privacy toggle
   * Shows actual amount or masked version based on visibility state
   */
  const formatBalance = (amount: number) => {
    if (!balanceVisible) {
      return "₦****.**";
    }
    return formatCurrency(amount);
  };

  /**
   * Download wallet statement
   * Triggers download of wallet transaction history
   */
  const handleDownloadStatement = async () => {
    try {
      const response = await fetch("/api/store/wallet/statement");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wallet-statement-${
          new Date().toISOString().split("T")[0]
        }.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // toast({
        //   title: "Success",
        //   description: "Wallet statement downloaded successfully",
        // })
      } else {
        throw new Error("Failed to download statement");
      }
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to download wallet statement",
      //   variant: "destructive",
      // })
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!walletData) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <Wallet className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Wallet Not Found</h3>
            <p className="text-muted-foreground">
              Unable to load wallet information
            </p>
          </div>
          <Button onClick={loadWalletData} variant="outline">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance */}
        <Card className="relative">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Balance
            </CardTitle>
            <div className="flex items-center space-x-2">
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
              {formatBalance(walletData.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for withdrawal
            </p>
          </CardContent>
        </Card>

        {/* Pending Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Balance
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatBalance(walletData.pending)}
            </div>
            <p className="text-xs text-muted-foreground">
              In escrow, awaiting release
            </p>
          </CardContent>
        </Card>

        {/* Total Earned */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatBalance(walletData.totalEarned)}
            </div>
            <p className="text-xs text-muted-foreground">All-time earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              onClick={onWithdrawClick}
              className="bg-green-600 hover:bg-green-700"
              disabled={walletData.balance <= 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Withdraw Funds
            </Button>

            <Button variant="outline" onClick={onTransactionHistoryClick}>
              <TrendingUp className="w-4 h-4 mr-2" />
              View Transactions
            </Button>

            <Button variant="outline" onClick={handleDownloadStatement}>
              <Download className="w-4 h-4 mr-2" />
              Download Statement
            </Button>

            <Button variant="outline" onClick={loadWalletData}>
              Refresh Balance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wallet Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Currency:</span>
              <Badge variant="outline" className="ml-2">
                {walletData.currency}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>
              <span className="ml-2 text-muted-foreground">
                {new Date(walletData.updatedAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-medium">Wallet Created:</span>
              <span className="ml-2 text-muted-foreground">
                {new Date(walletData.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="font-medium">Withdrawal Status:</span>
              <Badge
                variant={walletData.balance > 0 ? "default" : "secondary"}
                className="ml-2"
              >
                {walletData.balance > 0 ? "Available" : "No Funds"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
