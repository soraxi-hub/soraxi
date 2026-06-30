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
  CheckCircle,
  XCircle,
  AlertCircle,
  Banknote,
  Store,
  User,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import { RefundStatus, RefundTrigger } from "@/enums/financial.enums";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";
import { toast } from "sonner";

interface AdminRefundDetailProps {
  refundId: string;
}

// ---------------------------------------------------------------------------
// Copy button helper
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
 * Admin Refund Detail Component
 *
 * Displays a single refund record with full financial breakdown, vendor,
 * and customer details. When status is INITIATED, renders the manual
 * processing action panel so the admin can confirm or fail the refund
 * after executing it on the Flutterwave dashboard.
 *
 * Follows the same structure as AdminPayoutDetail.
 */
function AdminRefundDetail({ refundId }: AdminRefundDetailProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, refetch, isLoading, error } = useQuery(
    trpc.adminRefund.getAdminRefundById.queryOptions({ refundId }),
  );

  // ---- Action panel local state ----
  const [flutterwaveRefundId, setFlutterwaveRefundId] = useState("");
  const [showFailForm, setShowFailForm] = useState(false);
  const [failureReason, setFailureReason] = useState("");

  const confirmMutation = useMutation(
    trpc.adminRefund.confirmManualRefund.mutationOptions({
      onSuccess: (result) => {
        toast.success(result.message);
        setFlutterwaveRefundId("");
        setFailureReason("");
        setShowFailForm(false);
        refetch();
        queryClient.invalidateQueries({
          queryKey: trpc.adminRefund.getAdminRefunds.queryKey(),
        });
      },
      onError: (err) => {
        toast.error(err.message ?? "Something went wrong. Please try again.");
      },
    }),
  );

  const handleConfirm = () => {
    confirmMutation.mutate({
      refundId,
      action: "complete",
      flutterwaveRefundId: flutterwaveRefundId.trim(),
    });
  };

  const handleFail = () => {
    confirmMutation.mutate({
      refundId,
      action: "fail",
      failureReason: failureReason.trim(),
    });
  };

  const refund = data?.data;

  const getStatusBadge = (status: RefundStatus) => {
    switch (status) {
      case RefundStatus.INITIATED:
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Initiated</Badge>
        );
      case RefundStatus.COMPLETED:
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case RefundStatus.FAILED:
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTriggerDescription = (trigger: RefundTrigger): string => {
    switch (trigger) {
      case RefundTrigger.ORDER_CANCELLED:
        return "The vendor cancelled this order. The student receives a full refund including the platform commission.";
      case RefundTrigger.FAILED_DELIVERY:
        return "The vendor marked this delivery as failed. The student receives the vendor settle amount. Platform commission is retained.";
      case RefundTrigger.DISPUTE_UPHELD:
        return "A dispute was upheld in the student's favour. The student receives a full refund including the platform commission.";
      default:
        return "";
    }
  };

  const getStatusBanner = () => {
    if (!refund) return null;
    switch (refund.status) {
      case RefundStatus.INITIATED:
        return {
          borderColor: "border-l-yellow-500",
          icon: <Clock className="w-6 h-6 text-yellow-600" />,
          title: "Awaiting Manual Refund",
          message:
            "Execute this refund via the Flutterwave dashboard using the transaction ID below, then paste the Flutterwave refund ID and confirm.",
        };
      case RefundStatus.COMPLETED:
        return {
          borderColor: "border-l-green-500",
          icon: <CheckCircle className="w-6 h-6 text-green-600" />,
          title: "Refund Completed",
          message:
            "The refund has been confirmed and will be disbursed to the customer's original payment method within 3–15 business days.",
        };
      case RefundStatus.FAILED:
        return {
          borderColor: "border-l-red-500",
          icon: <XCircle className="w-6 h-6 text-red-600" />,
          title: "Refund Failed",
          message:
            "This refund failed. The refund liability remains open — manual follow-up is required.",
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
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !refund) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">Error Loading Details</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Refund record not found"}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const banner = getStatusBanner();
  const isInitiated = refund.status === RefundStatus.INITIATED;
  const isMutating = confirmMutation.isPending;

  return (
    <div className="space-y-6 py-6 px-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Refund Details</h1>
        <p className="text-muted-foreground">Refund ID: {refund.refundId}</p>
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
                  {getStatusBadge(refund.status)}
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
          {/* Trigger Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Refund Trigger
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground">Trigger Type</Label>
                <Badge variant="secondary">{refund.triggerLabel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {getTriggerDescription(refund.trigger)}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-mono text-sm flex items-center">
                    {refund.orderId.slice(-12)}
                    <CopyButton value={refund.orderId} />
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Suborder ID</Label>
                  <p className="font-mono text-sm flex items-center">
                    {refund.suborderId.slice(-12)}
                    <CopyButton value={refund.suborderId} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    Vendor Settle Amount
                  </Label>
                  <p className="font-medium">
                    {formatNaira(refund.amountBreakdown.settleAmount, {
                      showDecimals: true,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Commission{" "}
                    {refund.trigger === RefundTrigger.FAILED_DELIVERY
                      ? "(retained)"
                      : "(reversed)"}
                  </Label>
                  <p
                    className={`font-medium ${
                      refund.trigger === RefundTrigger.FAILED_DELIVERY
                        ? "text-muted-foreground"
                        : "text-red-600"
                    }`}
                  >
                    {formatNaira(refund.amountBreakdown.commission, {
                      showDecimals: true,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">
                    Total Refunded to Student
                  </Label>
                  <p className="font-medium text-green-600 flex items-center">
                    {formatNaira(refund.amountBreakdown.amountRefunded, {
                      showDecimals: true,
                    })}
                    {isInitiated && (
                      <CopyButton
                        value={String(
                          refund.amountBreakdown.amountRefunded / 100,
                        )}
                      />
                    )}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p>{format(new Date(refund.createdAt), "PPP 'at' p")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p>{format(new Date(refund.updatedAt), "PPP 'at' p")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Refund Action Panel — only shown for INITIATED refunds */}
          {isInitiated && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                  <Clock className="w-5 h-5" />
                  Record Refund Outcome
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Use the Flutterwave transaction ID in the sidebar to locate
                  and execute this refund on the Flutterwave dashboard. Once
                  done, paste the Flutterwave refund ID below and confirm.
                </p>

                {/* Confirm path */}
                {!showFailForm && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fw-refund-id">
                        Flutterwave Refund ID
                      </Label>
                      <Input
                        id="fw-refund-id"
                        placeholder="e.g. 75923"
                        value={flutterwaveRefundId}
                        onChange={(e) => setFlutterwaveRefundId(e.target.value)}
                        disabled={isMutating}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleConfirm}
                        disabled={isMutating || !flutterwaveRefundId.trim()}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isMutating ? "Saving..." : "Confirm Refund"}
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
                        placeholder="Describe why this refund could not be completed..."
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
          {refund.status === RefundStatus.FAILED && refund.failureReason && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  Failure Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="text-muted-foreground">Failure Reason</Label>
                <p className="text-red-600 mt-1">{refund.failureReason}</p>
                <p className="text-sm text-muted-foreground mt-3">
                  The refund liability (CUSTOMER_REFUND_PAYABLE) remains open. A
                  follow-up manual action is required to close it.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Flutterwave Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Flutterwave Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Transaction ID</Label>
                <p className="font-mono text-sm break-all flex items-center">
                  {refund.flutterwaveTransactionId}
                  {isInitiated && (
                    <CopyButton value={refund.flutterwaveTransactionId} />
                  )}
                </p>
                {isInitiated && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Use this to locate the transaction on the Flutterwave
                    dashboard.
                  </p>
                )}
              </div>
              {refund.flutterwaveRefundId && (
                <div className="pt-2 border-t">
                  <Label className="text-muted-foreground">Refund ID</Label>
                  <p className="font-mono text-sm break-all">
                    {refund.flutterwaveRefundId}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Vendor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Store Name</Label>
                <p className="font-medium">{refund.vendor?.name ?? "N/A"}</p>
              </div>
              {refund.vendor?.email && (
                <div>
                  <Label className="text-muted-foreground">Store Email</Label>
                  <p>{refund.vendor.email}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{refund.customer?.name ?? "N/A"}</p>
              </div>
              {refund.customer?.email && (
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p>{refund.customer.email}</p>
                </div>
              )}
              {refund.customer?.phoneNumber && (
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p>{refund.customer.phoneNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default withAdminAuth(AdminRefundDetail, {
  requiredPermissions: [PERMISSIONS.VIEW_REFUNDS],
});
