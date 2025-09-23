"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Store,
  Banknote,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  DollarSign,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import type { FormattedStoreWithdrawalRequestDetail } from "@/types/withdrawal-request-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StoreWithdrawalDetailProps {
  storeId: string;
  withdrawalId: string;
}

type WithdrawalStatus = FormattedStoreWithdrawalRequestDetail["status"];

export default function StoreWithdrawalDetail({
  storeId,
  withdrawalId,
}: StoreWithdrawalDetailProps) {
  const trpc = useTRPC();

  // Fetch withdrawal request details for the store
  const {
    data,
    refetch: loadWithdrawalDetail,
    isLoading: loading,
    error,
  } = useQuery(
    trpc.withdrawal.getStoreWithdrawalRequestDetail.queryOptions({
      storeId,
      requestId: withdrawalId,
    })
  );

  const withdrawalRequest = data?.request || null;

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

  return (
    <div className="space-y-6 py-6 px-6 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Withdrawal Request Details
            </h1>
            <p className="text-muted-foreground">
              {withdrawalRequest.requestNumber}
            </p>
          </div>
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
                  "This request is currently being reviewed by our team."}
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
                  )}. Funds returned to your wallet.`}
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
                    Your Description
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
                Your Store Information
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

          {/* Review Details */}
          {(withdrawalRequest.review.reviewedAt ||
            withdrawalRequest.review.rejectionReason) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-soraxi-green" />
                  Review Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {withdrawalRequest.review.reviewedAt && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Reviewed At
                    </Label>
                    <p className="font-medium">
                      {format(
                        new Date(withdrawalRequest.review.reviewedAt),
                        "PPP 'at' p"
                      )}
                    </p>
                  </div>
                )}
                {withdrawalRequest.review.notes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Review Notes
                    </Label>
                    <p className="text-sm">{withdrawalRequest.review.notes}</p>
                  </div>
                )}
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
          {withdrawalRequest.processing.processedAt && (
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
                    Processed At
                  </Label>
                  <p className="font-medium">
                    {format(
                      new Date(withdrawalRequest.processing.processedAt),
                      "PPP 'at' p"
                    )}
                  </p>
                </div>
                {withdrawalRequest.processing.transactionReference && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Transaction Reference
                    </Label>
                    <p className="font-medium">
                      {withdrawalRequest.processing.transactionReference}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
