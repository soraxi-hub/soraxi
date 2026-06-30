"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import { RefundStatus, RefundTrigger } from "@/enums/financial.enums";
import Link from "next/link";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";

type StatusFilter = "all" | RefundStatus;
type TriggerFilter = "all" | RefundTrigger;

/**
 * Admin Refund Records List
 *
 * Displays all platform refund records with status and trigger filtering
 * and pagination. Follows the same structure as AdminPayoutList.
 */
function AdminRefundList() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const limit = 10;

  const { data, isLoading } = useQuery(
    trpc.adminRefund.getAdminRefunds.queryOptions({
      page,
      limit,
      status: statusFilter,
      trigger: triggerFilter,
    }),
  );

  const refunds = data?.data?.refunds ?? [];
  const pagination = data?.data?.pagination;
  const summary = data?.data?.summary;

  const totalPages = pagination?.pages ?? 1;
  const totalRecords = pagination?.total ?? 0;

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  const handleTriggerChange = (value: string) => {
    setTriggerFilter(value as TriggerFilter);
    setPage(1);
  };

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

  const getTriggerBadge = (trigger: RefundTrigger) => {
    switch (trigger) {
      case RefundTrigger.ORDER_CANCELLED:
        return <Badge variant="secondary">Order Cancelled</Badge>;
      case RefundTrigger.FAILED_DELIVERY:
        return <Badge variant="secondary">Failed Delivery</Badge>;
      case RefundTrigger.DISPUTE_UPHELD:
        return <Badge variant="secondary">Dispute Upheld</Badge>;
      default:
        return <Badge variant="outline">{trigger}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Refund Records</h1>
          <p className="text-muted-foreground">
            Monitor and process all platform refund activity
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Awaiting Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.totalInitiated ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.totalCompleted ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.totalFailed ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-52">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={RefundStatus.INITIATED}>
                    Initiated
                  </SelectItem>
                  <SelectItem value={RefundStatus.COMPLETED}>
                    Completed
                  </SelectItem>
                  <SelectItem value={RefundStatus.FAILED}>Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-52">
              <Select value={triggerFilter} onValueChange={handleTriggerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Triggers</SelectItem>
                  <SelectItem value={RefundTrigger.ORDER_CANCELLED}>
                    Order Cancelled
                  </SelectItem>
                  <SelectItem value={RefundTrigger.FAILED_DELIVERY}>
                    Failed Delivery
                  </SelectItem>
                  <SelectItem value={RefundTrigger.DISPUTE_UPHELD}>
                    Dispute Upheld
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {totalRecords} total refund records
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refunds Table */}
      <Card>
        <CardHeader>
          <CardTitle>Refunds</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Refund ID</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount Refunded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : refunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">
                        No refund records found
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                refunds.map((refund) => (
                  <TableRow key={refund.refundId}>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {refund.refundId.slice(-8)}
                    </TableCell>
                    <TableCell>{getTriggerBadge(refund.trigger)}</TableCell>
                    <TableCell>
                      {refund.vendor?.name ?? (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {refund.customer?.name ?? (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNaira(refund.amountBreakdown.amountRefunded, {
                        showDecimals: true,
                      })}
                    </TableCell>
                    <TableCell>{getStatusBadge(refund.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/refunds/${refund.refundId}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalRecords)} of {totalRecords} refund
                records
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withAdminAuth(AdminRefundList, {
  requiredPermissions: [PERMISSIONS.VIEW_REFUNDS],
});
