"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertTriangle,
  Eye,
  DollarSign,
  User,
  Store,
  Filter,
  Calendar,
  RefreshCw,
  Package,
  Clock,
  XCircle,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";

type Status = "Canceled" | "Returned" | "Failed Delivery";

/**
 * Refund Approval Queue Component
 *
 * Interface for managing sub-orders that require manual admin approval for refund actions.
 * Shows sub-orders marked as Canceled, Returned, or Failed Delivery where escrow
 * has not been refunded or released yet.
 *
 * Business Logic:
 * - deliveryStatus IN ["Canceled", "Returned", "Failed Delivery"]
 * - escrow.held === true
 * - escrow.released === false
 * - escrow.refunded === false
 */

export function RefundApprovalQueue() {
  const trpc = useTRPC();
  const [summary, setSummary] = useState<{
    totalPendingRefunds: number;
    totalRefundAmount: number;
  }>({
    totalPendingRefunds: 0,
    totalRefundAmount: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const {
    data,
    refetch: loadRefundQueue,
    isLoading: loading,
  } = useQuery(
    trpc.adminRefund.getRefundQueue.queryOptions({
      page,
      limit,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString(),
      status: statusFilter !== "all" ? statusFilter : undefined,
    })
  );

  const refundQueue = data?.refundQueue || [];

  useEffect(() => {
    if (data) {
      setTotalItems(data.pagination.total);
      setTotalPages(data.pagination.pages);
      setSummary(data.summary);
    }
  }, []);

  useEffect(() => {
    loadRefundQueue();
  }, [statusFilter, page, limit]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Canceled: {
        color: "bg-red-100 text-red-800",
        icon: XCircle,
      },
      Returned: {
        color: "bg-orange-100 text-orange-800",
        icon: RotateCcw,
      },
      "Failed Delivery": {
        color: "bg-gray-100 text-gray-800",
        icon: AlertCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.Canceled;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const handleApplyFilters = () => {
    setPage(1); // Reset to first page when applying new filters
    loadRefundQueue();
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setFromDate(undefined);
    setToDate(undefined);
    setPage(1);
    // Load refund queue with reset filters
    setTimeout(() => {
      loadRefundQueue();
    }, 0);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            Refund Approval Queue
          </h1>
          <p className="text-muted-foreground">
            Manage sub-orders that require manual refund approval
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Refunds
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalPendingRefunds}
            </div>
            <p className="text-xs text-muted-foreground">
              Sub-orders awaiting refund approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Refund Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNaira(summary.totalRefundAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total amount pending refund
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="w-5 h-5 mr-2 text-soraxi-green" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 space-y-4">
            <div className="space-y-2">
              <Label>Delivery Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(e: Status | "all") => setStatusFilter(e)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Canceled">Canceled</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                  <SelectItem value="Failed Delivery">
                    Failed Delivery
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !fromDate ? "text-muted-foreground" : ""
                      }`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP") : "From Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !toDate ? "text-muted-foreground" : ""
                      }`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP") : "To Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      initialFocus
                      disabled={(date) => (fromDate ? date < fromDate : false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              onClick={handleApplyFilters}
              className="bg-soraxi-green hover:bg-soraxi-green-hover"
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="bg-transparent"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Refund Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-soraxi-green" />
            Refund Queue ({totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub-Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-soraxi-green mb-2" />
                      <span>Loading refund queue...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : refundQueue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <AlertTriangle className="h-12 w-12 text-soraxi-green mb-2" />
                      <h3 className="font-medium text-lg">
                        No refunds pending
                      </h3>
                      <p className="text-muted-foreground">
                        All refunds have been processed or no items match your
                        filters
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                refundQueue.map((item) => (
                  <TableRow key={item.subOrderId} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium font-mono text-sm">
                            {item.subOrderId.substring(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Order: {item.orderNumber}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {item.customer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.customer.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {item.store.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.store.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span className="font-medium">
                          {formatNaira(item.totalAmount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.deliveryStatus)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>
                          {format(
                            new Date(item.refundRequestDate),
                            "MMM dd, yyyy"
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          {format(new Date(item.refundRequestDate), "h:mm a")}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/refunds/queue/${item.subOrderId}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && refundQueue.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalItems)} of {totalItems} items
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum = page;
                    if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    if (pageNum > 0 && pageNum <= totalPages) {
                      return (
                        <Button
                          key={i}
                          variant={pageNum === page ? "default" : "outline"}
                          size="sm"
                          className={
                            pageNum === page
                              ? "bg-soraxi-green hover:bg-soraxi-green/90"
                              : ""
                          }
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
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
