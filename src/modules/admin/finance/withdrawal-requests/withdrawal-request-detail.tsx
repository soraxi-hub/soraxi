"use client";

import { TableCell } from "@/components/ui/table";

import { TableBody } from "@/components/ui/table";

import { TableHead } from "@/components/ui/table";

import { TableRow } from "@/components/ui/table";

import { TableHeader } from "@/components/ui/table";

import { Table } from "@/components/ui/table";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Store,
  Banknote,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  Mail,
  DollarSign,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import type { FormattedWithdrawalRequestDetail } from "@/types/withdrawal-request-types";

interface WithdrawalRequestDetailProps {
  requestId: string;
}

type WithdrawalStatus = FormattedWithdrawalRequestDetail["status"];

export default function WithdrawalRequestDetail({
  requestId,
}: WithdrawalRequestDetailProps) {
  const trpc = useTRPC();

  // State for approve dialog
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [transactionReference, setTransactionReference] = useState("");

  // State for reject dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");

  // Fetch withdrawal request details
  const {
    data,
    refetch: loadWithdrawalDetail,
    isLoading: loading,
    error,
  } = useQuery(
    trpc.withdrawal.getWithdrawalRequestDetail.queryOptions({ requestId })
  );

  const withdrawalRequest = data?.request || null;

  // Approve mutation
  const approveWithdrawal = useMutation(
    trpc.withdrawal.approveWithdrawalRequest.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          `Withdrawal request ${data.withdrawalRequest.requestNumber} approved successfully!`
        );
        loadWithdrawalDetail(); // Refetch data to update status
        setShowApproveDialog(false);
        setApproveNotes("");
        setTransactionReference("");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to approve withdrawal request.");
      },
    })
  );

  // Reject mutation
  const rejectWithdrawal = useMutation(
    trpc.withdrawal.rejectWithdrawalRequest.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          `Withdrawal request ${data.withdrawalRequest.requestNumber} rejected. Funds returned to wallet.`
        );
        loadWithdrawalDetail(); // Refetch data to update status
        setShowRejectDialog(false);
        setRejectReason("");
        setRejectNotes("");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reject withdrawal request.");
      },
    })
  );

  const handleApprove = () => {
    if (!withdrawalRequest) return;
    if (!transactionReference.trim()) {
      toast.error("Transaction reference is required for approval.");
      return;
    }
    approveWithdrawal.mutate({
      requestId: withdrawalRequest.id,
      transactionReference,
      notes: approveNotes,
    });
  };

  const handleReject = () => {
    if (!withdrawalRequest) return;
    if (!rejectReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    rejectWithdrawal.mutate({
      requestId: withdrawalRequest.id,
      reason: rejectReason,
      notes: rejectNotes,
    });
  };

  const getStatusBadge = (status: WithdrawalStatus) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      processing: "bg-purple-100 text-purple-800",
      completed: "bg-green-200 text-green-900",
      rejected: "bg-red-100 text-red-800",
      failed: "bg-red-200 text-red-900",
    };

    return (
      <Badge className={colors[status]}>
        {status.replace(/_/g, " ").charAt(0).toUpperCase() +
          status.replace(/_/g, " ").slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-soraxi-green mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading withdrawal details...</p>
        </div>
      </div>
    );
  }

  if (error || !withdrawalRequest) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">Error Loading Details</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Withdrawal request not found"}
          </p>
          <Button variant="outline" onClick={() => loadWithdrawalDetail()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const isActionable =
    withdrawalRequest.status === "pending" ||
    withdrawalRequest.status === "under_review";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/finance/withdrawal-requests">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Requests
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Withdrawal Request Details
            </h1>
            <p className="text-muted-foreground">
              {withdrawalRequest.requestNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {isActionable && (
            <>
              <Button
                onClick={() => setShowApproveDialog(true)}
                className="bg-soraxi-green hover:bg-soraxi-green/90 text-white"
                disabled={approveWithdrawal.isPending}
              >
                {approveWithdrawal.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>Approve ({formatNaira(withdrawalRequest.netAmount)})</>
                )}
              </Button>
              <Button
                onClick={() => setShowRejectDialog(true)}
                variant="destructive"
                disabled={rejectWithdrawal.isPending}
              >
                {rejectWithdrawal.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>Reject</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <Card
        className={`border-${
          withdrawalRequest.status.includes("approved") ||
          withdrawalRequest.status === "completed"
            ? "green"
            : withdrawalRequest.status.includes("rejected") ||
              withdrawalRequest.status === "failed"
            ? "red"
            : "orange"
        }-500`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            {withdrawalRequest.status.includes("approved") ||
            withdrawalRequest.status === "completed" ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : withdrawalRequest.status.includes("rejected") ||
              withdrawalRequest.status === "failed" ? (
              <XCircle className="w-6 h-6 text-red-600" />
            ) : (
              <Clock className="w-6 h-6 text-orange-600" />
            )}
            <div>
              <h3
                className={`font-medium text-${
                  withdrawalRequest.status.includes("approved") ||
                  withdrawalRequest.status === "completed"
                    ? "green"
                    : withdrawalRequest.status.includes("rejected") ||
                      withdrawalRequest.status === "failed"
                    ? "red"
                    : "orange"
                }-800`}
              >
                Withdrawal Status: {getStatusBadge(withdrawalRequest.status)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {withdrawalRequest.status === "pending" &&
                  "This request is awaiting review and approval."}
                {withdrawalRequest.status === "under_review" &&
                  "This request is currently being reviewed by an admin."}
                {withdrawalRequest.status === "approved" &&
                  `Funds approved on ${format(
                    new Date(withdrawalRequest.review.reviewedAt!),
                    "PPP 'at' p"
                  )}.`}
                {withdrawalRequest.status === "processing" &&
                  "Funds are being processed for transfer."}
                {withdrawalRequest.status === "completed" &&
                  `Funds transferred on ${format(
                    new Date(withdrawalRequest.processing.processedAt!),
                    "PPP 'at' p"
                  )}.`}
                {withdrawalRequest.status === "rejected" &&
                  `Request rejected on ${format(
                    new Date(withdrawalRequest.review.reviewedAt!),
                    "PPP 'at' p"
                  )}. Funds returned to wallet.`}
                {withdrawalRequest.status === "failed" &&
                  `Payout failed on ${format(
                    new Date(withdrawalRequest.processing.processedAt!),
                    "PPP 'at' p"
                  )}.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Banknote className="w-5 h-5 mr-2 text-soraxi-green" />
                Request Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Request Number
                  </Label>
                  <p className="font-medium">
                    {withdrawalRequest.requestNumber}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Requested Amount
                  </Label>
                  <p className="font-medium">
                    {formatNaira(withdrawalRequest.requestedAmount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Processing Fee
                  </Label>
                  <p className="font-medium">
                    {formatNaira(withdrawalRequest.processingFee)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Net Amount
                  </Label>
                  <p className="font-medium text-green-600">
                    {formatNaira(withdrawalRequest.netAmount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Request Date
                  </Label>
                  <p className="font-medium">
                    {format(
                      new Date(withdrawalRequest.createdAt),
                      "PPP 'at' p"
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </Label>
                  <p className="font-medium">
                    {format(
                      new Date(withdrawalRequest.updatedAt),
                      "PPP 'at' p"
                    )}
                  </p>
                </div>
              </div>

              {withdrawalRequest.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Description from Store
                  </Label>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {withdrawalRequest.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Banknote className="w-5 h-5 mr-2 text-soraxi-green" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Bank Name
                </Label>
                <p className="font-medium">
                  {withdrawalRequest.bankDetails.bankName}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Account Holder Name
                </Label>
                <p className="font-medium">
                  {withdrawalRequest.bankDetails.accountHolderName}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Account Number
                </Label>
                <p className="font-medium">
                  {withdrawalRequest.bankDetails.accountNumber}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-soraxi-green" />
                Status History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalRequest.statusHistory.map((history, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {getStatusBadge(history.status as WithdrawalStatus)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(history.timestamp), "PPP 'at' p")}
                      </TableCell>
                      <TableCell>{history.adminName || "System"}</TableCell>
                      <TableCell>{history.notes || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="w-5 h-5 mr-2 text-soraxi-green" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Store Name
                </Label>
                <p className="font-medium">{withdrawalRequest.store.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Store Email
                </Label>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">{withdrawalRequest.store.email}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Current Wallet Balance
                </Label>
                <p className="font-medium text-lg">
                  {formatNaira(withdrawalRequest.store.walletBalance)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Admin Review Details */}
          {withdrawalRequest.review.reviewedBy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-soraxi-green" />
                  Admin Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Reviewed By
                  </Label>
                  <p className="font-medium">
                    {withdrawalRequest.review.reviewedBy.name} (
                    {withdrawalRequest.review.reviewedBy.email})
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Reviewed At
                  </Label>
                  <p className="font-medium">
                    {withdrawalRequest.review.reviewedAt
                      ? format(
                          new Date(withdrawalRequest.review.reviewedAt),
                          "PPP 'at' p"
                        )
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Review Notes
                  </Label>
                  <p className="text-sm">
                    {withdrawalRequest.review.notes || "N/A"}
                  </p>
                </div>
                {withdrawalRequest.review.rejectionReason && (
                  <div>
                    <Label className="text-sm font-medium text-red-600">
                      Rejection Reason
                    </Label>
                    <p className="text-sm text-red-600">
                      {withdrawalRequest.review.rejectionReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Processing Details */}
          {withdrawalRequest.processing.processedBy && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-soraxi-green" />
                  Processing Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Processed By
                  </Label>
                  <p className="font-medium">
                    {withdrawalRequest.processing.processedBy.name} (
                    {withdrawalRequest.processing.processedBy.email})
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Processed At
                  </Label>
                  <p className="font-medium">
                    {withdrawalRequest.processing.processedAt
                      ? format(
                          new Date(withdrawalRequest.processing.processedAt),
                          "PPP 'at' p"
                        )
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Transaction Reference
                  </Label>
                  <p className="font-medium">
                    {withdrawalRequest.processing.transactionReference || "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              Confirm Approval
            </DialogTitle>
            <DialogDescription>
              You are about to approve withdrawal request{" "}
              <strong>{withdrawalRequest.requestNumber}</strong> for{" "}
              <strong>{formatNaira(withdrawalRequest.netAmount)}</strong> to{" "}
              {withdrawalRequest.store.name}. This action will mark the request
              as approved and notify the store.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="transaction-reference">
                Transaction Reference
              </Label>
              <Input
                id="transaction-reference"
                placeholder="Enter payment gateway transaction reference"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="approve-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                placeholder="Add any notes for this approval..."
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={approveWithdrawal.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={
                approveWithdrawal.isPending || !transactionReference.trim()
              }
              className="bg-soraxi-green hover:bg-soraxi-green/90 text-white"
            >
              {approveWithdrawal.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>Approve Withdrawal</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              Confirm Rejection
            </DialogTitle>
            <DialogDescription>
              You are about to reject withdrawal request{" "}
              <strong>{withdrawalRequest.requestNumber}</strong>. Funds will be
              returned to the store&#39;s wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Reason for Rejection</Label>
              <Textarea
                id="reject-reason"
                placeholder="Clearly state the reason for rejecting this withdrawal request."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="reject-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="reject-notes"
                placeholder="Add any internal notes for this rejection..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={rejectWithdrawal.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectWithdrawal.isPending || !rejectReason.trim()}
              variant="destructive"
            >
              {rejectWithdrawal.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>Reject Withdrawal</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
