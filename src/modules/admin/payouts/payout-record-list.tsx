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
import { Receipt, Eye } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import { PayoutStatus } from "@/enums/financial.enums";
import Link from "next/link";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";

type StatusFilter = "all" | PayoutStatus;

/**
 * Admin Payout Records List
 *
 * Displays all platform payout records with status filtering and pagination.
 * No manual actions – purely a monitoring interface.
 */
function AdminPayoutList() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const limit = 10;

  const { data, isLoading } = useQuery(
    trpc.adminPayout.getAdminWithdrawals.queryOptions({
      page,
      limit,
      status: statusFilter,
    }),
  );

  const withdrawals = data?.data?.withdrawals ?? [];
  const pagination = data?.data?.pagination;
  const summary = data?.data?.summary;

  const totalPages = pagination?.pages ?? 1;
  const totalRecords = pagination?.total ?? 0;

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payout Records</h1>
          <p className="text-muted-foreground">
            Monitor all platform payout activity
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Initiated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.totalInitiated ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {summary?.totalProcessing ?? 0}
            </p>
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

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={PayoutStatus.INITIATED}>
                    Initiated
                  </SelectItem>
                  <SelectItem value={PayoutStatus.PROCESSING}>
                    Processing
                  </SelectItem>
                  <SelectItem value={PayoutStatus.COMPLETED}>
                    Completed
                  </SelectItem>
                  <SelectItem value={PayoutStatus.FAILED}>Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {totalRecords} total payout records
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payout ID</TableHead>
                <TableHead className="text-right">Requested Amount</TableHead>
                <TableHead className="text-right">Processing Fee</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: limit }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : withdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No payout records found
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.payoutRecordId}>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {withdrawal.payoutRecordId.slice(-8)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNaira(withdrawal.amountBreakdown.requestedAmount, {
                        showDecimals: true,
                      })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      -
                      {formatNaira(withdrawal.amountBreakdown.processingFee, {
                        showDecimals: true,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNaira(withdrawal.amountBreakdown.netAmount, {
                        showDecimals: true,
                      })}
                    </TableCell>
                    <TableCell>{withdrawal.bankDetails.accountName}</TableCell>
                    <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/admin/payouts/${withdrawal.payoutRecordId}`}
                        >
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
                {Math.min(page * limit, totalRecords)} of {totalRecords} payout
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

export default withAdminAuth(AdminPayoutList, {
  requiredPermissions: [PERMISSIONS.VIEW_WITHDRAWALS],
});
