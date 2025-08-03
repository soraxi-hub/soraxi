"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  DollarSign,
  MoreHorizontal,
  Eye,
  Search,
  Filter,
  CalendarDays,
  Clock,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import type { FormattedWithdrawalRequestListItem } from "@/types/withdrawal-request-types";
import Link from "next/link"; // Import Link for navigation

type WithdrawalStatus = FormattedWithdrawalRequestListItem["status"];

/**
 * WithdrawalRequestList Component
 * Admin interface for viewing and managing store withdrawal requests.
 */
export function WithdrawalRequestList() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Fetch withdrawal requests
  const {
    data: requestsData,
    isLoading,
    refetch: refetchRequests,
  } = useQuery(
    trpc.withdrawal.getWithdrawalRequests.queryOptions({
      page,
      limit,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchQuery || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    })
  );

  const requests = requestsData?.requests || [];
  const total = requestsData?.pagination.total || 0;
  const summary = requestsData?.summary;

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, fromDate, toDate, limit]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <DollarSign className="w-8 h-8 mr-3 text-soraxi-green" />
            Withdrawal Requests
          </h1>
          <p className="text-muted-foreground">Manage store payout requests</p>
        </div>
        <div className="flex space-x-4">
          <Card className="p-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pending
            </CardTitle>
            <p className="text-2xl font-bold">{summary?.totalPending || 0}</p>
          </Card>
          <Card className="p-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Approved Amount
            </CardTitle>
            <p className="text-2xl font-bold">
              {formatNaira(summary?.totalApprovedAmount || 0)}
            </p>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(val: WithdrawalStatus | "all") =>
                  setStatusFilter(val)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => refetchRequests()}
              className="bg-soraxi-green hover:bg-soraxi-green-hover"
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Requests ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request No.</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Requested Amount</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                    Loading withdrawal requests...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No withdrawal requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.requestNumber}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{request.store.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.store.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      {formatNaira(request.requestedAmount)}
                    </TableCell>
                    <TableCell>{formatNaira(request.netAmount)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/admin/finance/withdrawals/${request.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {/* TODO: Add Approve/Reject actions here */}
                          <DropdownMenuSeparator />
                          {request.status === "pending" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.info("Approve action coming soon!")
                                }
                                className="text-green-600"
                              >
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.info("Reject action coming soon!")
                                }
                                className="text-red-600"
                              >
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {!isLoading && requests.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} requests
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page * limit >= total}
                  onClick={() => setPage(page + 1)}
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
