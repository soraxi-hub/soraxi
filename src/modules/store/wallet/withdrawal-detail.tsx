"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Banknote,
  Building2,
  CreditCard,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { PayoutStatus } from "@/enums/financial.enums";
import { DateFormatter } from "@/lib/utils/date-formatter";

interface WithdrawalDetailProps {
  withdrawalId: string;
}

/**
 * Withdrawal Detail Page Component
 *
 * Displays a single payout record with a clean, Stripe-like layout.
 * Fetches data from the `withdrawal.getWithdrawalById` tRPC procedure.
 *
 * Features:
 * - Status banner with contextual message
 * - Amount breakdown (requested, fee, net)
 * - Bank details with masked account number
 * - Failure reason card (only for failed payouts)
 * - Loading skeletons and error handling
 */
export default function WithdrawalDetail({
  withdrawalId,
}: WithdrawalDetailProps) {
  const trpc = useTRPC();

  const {
    data,
    refetch: loadWithdrawalDetail,
    isLoading,
    error,
  } = useQuery(
    trpc.withdrawal.getWithdrawalById.queryOptions({
      payoutRecordId: withdrawalId,
    }),
  );

  const payout = data?.data;

  /**
   * Returns a styled badge for the payout status.
   */
  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case PayoutStatus.INITIATED:
        return <Badge variant="secondary">Initiated</Badge>;
      case PayoutStatus.PROCESSING:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Processing
          </Badge>
        );
      case PayoutStatus.COMPLETED:
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Completed
          </Badge>
        );
      case PayoutStatus.FAILED:
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  /**
   * Masks bank account number showing only last 4 digits.
   */
  const maskAccountNumber = (accountNumber: string): string => {
    if (!accountNumber || accountNumber.length <= 4) return "******";
    return `******${accountNumber.slice(-4)}`;
  };

  // Loading state with skeletons
  if (isLoading) {
    return (
      <div className="space-y-6 py-6 px-6 min-h-screen bg-background">
        {/* Header skeleton */}
        <div className="border-b pb-4">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>

        {/* Status banner skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two-column grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !payout) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">Error Loading Details</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Withdrawal not found"}
          </p>
          <Button variant="outline" onClick={() => loadWithdrawalDetail()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Determine status banner icon and message
  const getStatusBanner = () => {
    switch (payout.status) {
      case PayoutStatus.INITIATED:
        return {
          icon: <Clock className="w-6 h-6 text-yellow-600" />,
          title: "Withdrawal initiated",
          message:
            "Your withdrawal request has been created and is awaiting processing.",
        };
      case PayoutStatus.PROCESSING:
        return {
          icon: <RefreshCw className="w-6 h-6 text-blue-600" />,
          title: "Processing",
          message: "Your payout is currently being processed.",
        };
      case PayoutStatus.COMPLETED:
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          title: "Payout completed",
          message:
            "Funds have been successfully transferred to your bank account.",
        };
      case PayoutStatus.FAILED:
        return {
          icon: <XCircle className="w-6 h-6 text-red-600" />,
          title: "Payout failed",
          message:
            "This payout failed and funds have been returned to your wallet.",
        };
      default:
        return {
          icon: <Clock className="w-6 h-6" />,
          title: "Unknown status",
          message: "",
        };
    }
  };

  const banner = getStatusBanner();

  return (
    <div className="space-y-6 py-6 px-6 min-h-screen bg-background">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-foreground">
          Withdrawal Details
        </h1>
        <p className="text-muted-foreground mt-1">
          Payout Record ID: {payout.id}
        </p>
      </div>

      {/* Status Banner */}
      <Card
        className={`border-l-4 border-l-${payout.status === PayoutStatus.COMPLETED ? "green-500" : payout.status === PayoutStatus.FAILED ? "red-500" : "yellow-500"}`}
      >
        <CardContent>
          <div className="flex items-center space-x-3">
            {banner.icon}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{banner.title}</h3>
                {getStatusBadge(payout.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {banner.message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Breakdown Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Banknote className="w-5 h-5 mr-2 text-primary" />
                Amount Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Requested Amount
                  </Label>
                  <p className="font-medium">
                    {payout.amountBreakdown.formattedRequestedAmount}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Processing Fee
                  </Label>
                  <p className="font-medium text-muted-foreground">
                    -{payout.amountBreakdown.formattedProcessingFee}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Net Amount
                  </Label>
                  <p className="font-medium text-green-600">
                    {payout.amountBreakdown.formattedNetAmount}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Created At
                  </Label>
                  <p className="font-medium">
                    {DateFormatter.dateTime(payout.createdAt)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </Label>
                  <p className="font-medium">
                    {DateFormatter.dateTime(payout.updatedAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-primary" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Account Name
                  </Label>
                  <p className="font-medium">
                    {payout.bankDetails.accountName}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Account Number
                  </Label>
                  <p className="font-medium font-mono">
                    {maskAccountNumber(payout.bankDetails.accountNumber)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Bank Code
                  </Label>
                  <p className="font-medium">{payout.bankDetails.bankCode}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Failure Details Card (only if failed) */}
          {payout.status === PayoutStatus.FAILED && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/10">
              <CardHeader>
                <CardTitle className="flex items-center text-red-700 dark:text-red-400">
                  <XCircle className="w-5 h-5 mr-2" />
                  Failure Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-red-700 dark:text-red-400">
                    Failure Reason
                  </Label>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {payout.failureReason || "No failure reason was provided."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optional: Flutterwave Transfer ID if present */}
          {payout.flutterwaveTransferId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-primary" />
                  Transfer Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm break-all">
                  {payout.flutterwaveTransferId}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
