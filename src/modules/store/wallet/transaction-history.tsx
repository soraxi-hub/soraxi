"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Receipt,
  MoreHorizontal,
  EyeIcon,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { PayoutStatus } from "@/enums/financial.enums";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

/**
 * Status options for filtering withdrawal requests.
 */
type WithdrawalStatusFilter = "all" | PayoutStatus;

/**
 * Mapping of filter values to actual PayoutStatus enum values.
 */
const STATUS_FILTER_MAP: Record<
  Exclude<WithdrawalStatusFilter, "all">,
  PayoutStatus
> = {
  initiated: PayoutStatus.INITIATED,
  processing: PayoutStatus.PROCESSING,
  completed: PayoutStatus.COMPLETED,
  failed: PayoutStatus.FAILED,
};

/**
 * Withdrawal History Component
 *
 * Displays a paginated list of vendor payout/withdrawal requests with status filtering.
 * Fetches data from the `withdrawal.getWithdrawals` tRPC procedure.
 *
 * Features:
 * - Status-based filtering (all, initiated, processing, completed, failed)
 * - Pagination with page size of 10 records
 * - Professional table layout showing withdrawal details
 * - Masked bank account numbers for privacy
 * - Loading skeletons and empty state handling
 * - Refresh button to manually reload data
 */
export default function WithdrawalHistory({ storeId }: { storeId: string }) {
  const trpc = useTRPC();

  // Filter state: only withdrawal status
  const [statusFilter, setStatusFilter] =
    useState<WithdrawalStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Compute actual status value for the API call
  const apiStatus =
    statusFilter === "all" ? undefined : STATUS_FILTER_MAP[statusFilter];

  const {
    data,
    refetch: refreshWithdrawals,
    isLoading,
  } = useQuery(
    trpc.withdrawal.getWithdrawals.queryOptions({
      page: currentPage,
      limit: pageSize,
      status: apiStatus,
    }),
  );

  // Extract withdrawal list and pagination from response
  const withdrawals = data?.data?.withdrawals ?? [];
  const pagination = data?.data?.pagination;

  const totalPages = pagination?.pages ?? 1;
  const totalWithdrawals = pagination?.total ?? 0;

  /**
   * Handles status filter change and resets to first page.
   */
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as WithdrawalStatusFilter);
    setCurrentPage(1);
  };

  /**
   * Handles page navigation.
   */
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  /**
   * Returns a styled badge for the withdrawal status.
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
   * Example: "1234567890" → "******7890"
   */
  const maskAccountNumber = (accountNumber: string): string => {
    if (!accountNumber || accountNumber.length <= 4) return "****";
    const visiblePart = accountNumber.slice(-4);
    return `******${visiblePart}`;
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            Withdrawal History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={handleStatusFilterChange}
                >
                  <SelectTrigger id="status-filter" className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="initiated">Initiated</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Refresh Button & Stats */}
            <div className="flex items-center gap-4">
              <Button
                onClick={() => refreshWithdrawals()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <div className="text-sm text-muted-foreground">
                {totalWithdrawals} total withdrawals
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Requested Amount</TableHead>
                <TableHead className="text-right">Processing Fee</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-20" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-24 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-20 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-24 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-32" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : withdrawals.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center space-y-3">
                      <Receipt className="h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No withdrawals found
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell>
                      <div className="text-sm">
                        <p>{withdrawal.formattedCreatedAtDate}</p>
                        <p className="text-muted-foreground text-xs">
                          {withdrawal.formattedCreatedAtTime}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {withdrawal.amountBreakdown.formattedRequestedAmount}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      -{withdrawal.amountBreakdown.formattedProcessingFee}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {withdrawal.amountBreakdown.formattedNetAmount}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {maskAccountNumber(
                          withdrawal.bankDetails.accountNumber,
                        )}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/store/${storeId}/withdrawals/${withdrawal.id}`}
                            >
                              <EyeIcon className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, totalWithdrawals)} of{" "}
                {totalWithdrawals} withdrawals
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
