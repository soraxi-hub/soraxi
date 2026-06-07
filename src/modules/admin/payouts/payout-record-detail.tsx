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
  Store,
} from "lucide-react";
import { format } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import { PayoutStatus } from "@/enums/financial.enums";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";

interface AdminPayoutDetailProps {
  payoutRecordId: string;
}

/**
 * Admin Payout Detail Component
 *
 * Displays a single payout record with store information and full details.
 * No action buttons – read-only view for administrators.
 */
function AdminPayoutDetail({ payoutRecordId }: AdminPayoutDetailProps) {
  const trpc = useTRPC();

  const { data, refetch, isLoading, error } = useQuery(
    trpc.adminPayout.getAdminWithdrawalById.queryOptions({
      payoutRecordId,
    }),
  );

  const payout = data?.data;

  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case PayoutStatus.INITIATED:
        return <Badge variant="secondary">Initiated</Badge>;
      case PayoutStatus.PROCESSING:
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case PayoutStatus.COMPLETED:
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case PayoutStatus.FAILED:
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const maskAccountNumber = (accountNumber: string): string => {
    if (!accountNumber || accountNumber.length <= 4) return "******";
    return `******${accountNumber.slice(-4)}`;
  };

  const getStatusBanner = () => {
    if (!payout) return null;
    switch (payout.status) {
      case PayoutStatus.INITIATED:
        return {
          icon: <Clock className="w-6 h-6 text-yellow-600" />,
          title: "Payout Initiated",
          message:
            "The payout request has been created and is awaiting processing.",
        };
      case PayoutStatus.PROCESSING:
        return {
          icon: <RefreshCw className="w-6 h-6 text-blue-600" />,
          title: "Processing",
          message: "This payout is currently being processed.",
        };
      case PayoutStatus.COMPLETED:
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          title: "Payout Completed",
          message:
            "Funds have been successfully transferred to the vendor's bank account.",
        };
      case PayoutStatus.FAILED:
        return {
          icon: <XCircle className="w-6 h-6 text-red-600" />,
          title: "Payout Failed",
          message:
            "This payout failed. Funds have been returned to the vendor's wallet.",
        };
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 py-6 px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !payout) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">Error Loading Details</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Payout record not found"}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const banner = getStatusBanner();

  return (
    <div className="space-y-6 py-6 px-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payout Details</h1>
          <p className="text-muted-foreground">
            Payout ID: {payout.payoutRecordId}
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {banner && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                Amount Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">
                    Requested Amount
                  </Label>
                  <p className="font-medium">
                    {formatNaira(payout.amountBreakdown.requestedAmount, {
                      showDecimals: true,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Processing Fee
                  </Label>
                  <p className="font-medium text-muted-foreground">
                    -
                    {formatNaira(payout.amountBreakdown.processingFee, {
                      showDecimals: true,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Net Amount</Label>
                  <p className="font-medium text-green-600">
                    {formatNaira(payout.amountBreakdown.netAmount, {
                      showDecimals: true,
                    })}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p>{format(new Date(payout.createdAt), "PPP 'at' p")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p>{format(new Date(payout.updatedAt), "PPP 'at' p")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Account Name</Label>
                <p>{payout.bankDetails.accountName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Account Number</Label>
                <p className="font-mono">
                  {maskAccountNumber(payout.bankDetails.accountNumber)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Bank Code</Label>
                <p>{payout.bankDetails.bankCode}</p>
              </div>
            </CardContent>
          </Card>

          {/* Failure Details (if failed) */}
          {payout.status === PayoutStatus.FAILED && payout.failureReason && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  Failure Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-muted-foreground">Failure Reason</Label>
                <p className="text-red-600">{payout.failureReason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Store Name</Label>
                <p className="font-medium">{payout.store?.name || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Store Email</Label>
                <p>{payout.store?.email || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Reference (if available) */}
          {payout.flutterwaveTransferId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
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

export default withAdminAuth(AdminPayoutDetail, {
  requiredPermissions: [PERMISSIONS.VIEW_WITHDRAWALS],
});
