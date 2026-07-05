"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import { PayoutStatus } from "@/enums/financial.enums";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";
import { toast } from "sonner";

interface AdminPayoutDetailProps {
  payoutRecordId: string;
}

// ---------------------------------------------------------------------------
// Small copy-to-clipboard helper button
// ---------------------------------------------------------------------------
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Admin Payout Detail Component
 *
 * Displays a single payout record with store information and full details.
 * When status is INITIATED, renders the manual payout action panel so the
 * admin can confirm or fail the transfer after executing it on Flutterwave.
 */
function AdminPayoutDetail({ payoutRecordId }: AdminPayoutDetailProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, refetch, isLoading, error } = useQuery(
    trpc.adminPayout.getAdminWithdrawalById.queryOptions({
      payoutRecordId,
    }),
  );

  // ---- Action panel local state ----
  const [flutterwaveReference, setFlutterwaveReference] = useState("");
  const [showFailForm, setShowFailForm] = useState(false);
  const [failureReason, setFailureReason] = useState("");

  const confirmMutation = useMutation(
    trpc.adminPayout.confirmManualPayout.mutationOptions({
      onSuccess: (result) => {
        toast.success(result.message);
        setFlutterwaveReference("");
        setFailureReason("");
        setShowFailForm(false);
        refetch();
        // Invalidate list so summary counts stay accurate
        queryClient.invalidateQueries({
          queryKey: trpc.adminPayout.getAdminWithdrawals.queryKey(),
        });
      },
      onError: (err) => {
        toast.error(err.message ?? "Something went wrong. Please try again.");
      },
    }),
  );

  const handleConfirm = () => {
    confirmMutation.mutate({
      payoutRecordId,
      action: "complete",
      flutterwaveReference: flutterwaveReference.trim(),
    });
  };

  const handleFail = () => {
    confirmMutation.mutate({
      payoutRecordId,
      action: "fail",
      failureReason: failureReason.trim(),
    });
  };

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
          borderColor: "border-l-yellow-500",
          icon: <Clock className="w-6 h-6 text-yellow-600" />,
          title: "Awaiting Manual Transfer",
          message:
            "Transfer this payout via the Flutterwave dashboard, then paste the reference below and confirm.",
        };
      case PayoutStatus.PROCESSING:
        return {
          borderColor: "border-l-blue-500",
          icon: <RefreshCw className="w-6 h-6 text-blue-600" />,
          title: "Processing",
          message: "This payout is currently being processed.",
        };
      case PayoutStatus.COMPLETED:
        return {
          borderColor: "border-l-green-500",
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          title: "Payout Completed",
          message:
            "Funds have been successfully transferred to the vendor's bank account.",
        };
      case PayoutStatus.FAILED:
        return {
          borderColor: "border-l-red-500",
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
  const isInitiated = payout.status === PayoutStatus.INITIATED;
  const isMutating = confirmMutation.isPending;

  return (
    <div className="space-y-6 py-6 px-6">
      {/* Header */}
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
        <Card className={`border-l-4 ${banner.borderColor}`}>
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
                  <p className="font-medium flex items-center">
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
                  <p className="font-medium text-green-600 flex items-center">
                    {formatNaira(payout.amountBreakdown.netAmount, {
                      showDecimals: true,
                    })}
                    {isInitiated && (
                      <CopyButton
                        value={String(payout.amountBreakdown.netAmount / 100)}
                      />
                    )}
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
                <p className="flex items-center">
                  {payout.bankDetails.accountName}
                  {isInitiated && (
                    <CopyButton value={payout.bankDetails.accountName} />
                  )}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Account Number</Label>
                <p className="font-mono flex items-center">
                  {isInitiated
                    ? payout.bankDetails.accountNumber
                    : maskAccountNumber(payout.bankDetails.accountNumber)}
                  {isInitiated && (
                    <CopyButton value={payout.bankDetails.accountNumber} />
                  )}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Bank Code</Label>
                <p className="flex items-center">
                  {payout.bankDetails.bankCode}
                  {isInitiated && (
                    <CopyButton value={payout.bankDetails.bankCode} />
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Manual Payout Action Panel — only shown for INITIATED payouts */}
          {isInitiated && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                  <Clock className="w-5 h-5" />
                  Record Transfer Outcome
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  After executing the transfer on the Flutterwave dashboard,
                  paste the transfer reference below and confirm. If the
                  transfer could not be made, use "Mark as Failed" instead.
                </p>

                {/* Confirm path */}
                {!showFailForm && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fw-reference">
                        Flutterwave Transfer Reference
                      </Label>
                      <Input
                        id="fw-reference"
                        placeholder="e.g. FLW-REF-123456789"
                        value={flutterwaveReference}
                        onChange={(e) =>
                          setFlutterwaveReference(e.target.value)
                        }
                        disabled={isMutating}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleConfirm}
                        disabled={isMutating || !flutterwaveReference.trim()}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isMutating ? "Saving..." : "Confirm Payment"}
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setShowFailForm(true)}
                        disabled={isMutating}
                      >
                        Mark as Failed
                      </Button>
                    </div>
                  </div>
                )}

                {/* Fail path */}
                {showFailForm && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="failure-reason">Failure Reason</Label>
                      <Textarea
                        id="failure-reason"
                        placeholder="Describe why this payout could not be completed..."
                        value={failureReason}
                        onChange={(e) => setFailureReason(e.target.value)}
                        disabled={isMutating}
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleFail}
                        disabled={isMutating || !failureReason.trim()}
                        variant="destructive"
                      >
                        {isMutating ? "Saving..." : "Confirm Failure"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setShowFailForm(false)}
                        disabled={isMutating}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Failure Details (terminal FAILED state) */}
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

          {/* Transfer Reference (completed state) */}
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
