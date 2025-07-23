"use client";

import { useState, useEffect } from "react";
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
  DollarSign,
  Eye,
  Clock,
  CheckCircle,
  Store,
  User,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  TrendingUp,
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
import { toast } from "sonner";

/**
 * Escrow Release Queue Component
 * Interface for managing escrow fund releases to sellers
 */

interface EscrowSubOrder {
  id: string;
  orderNumber: string;
  subOrderNumber: string;
  orderId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  store: {
    id: string;
    name: string;
    email: string;
    logo?: string;
  };
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  escrowAmount: number;
  deliveryInfo: {
    status: string;
    deliveredAt: string;
    returnWindow: string;
    daysSinceReturnWindow: number;
    customerConfirmed: boolean;
    autoConfirmed: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface EscrowSummary {
  totalPendingReleases: number;
  totalEscrowAmount: number;
  averageEscrowAmount: number;
  oldestPendingDays: number;
}

export function EscrowReleaseQueue() {
  const [subOrders, setSubOrders] = useState<EscrowSubOrder[]>([]);
  const [summary, setSummary] = useState<EscrowSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalSubOrders, setTotalSubOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadEscrowQueue();
  }, [page, limit]);

  const loadEscrowQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Add filters to params
      if (fromDate) params.append("fromDate", fromDate.toISOString());
      if (toDate) params.append("toDate", toDate.toISOString());
      if (searchQuery) params.append("search", searchQuery);
      if (storeFilter !== "all") params.append("storeId", storeFilter);

      // Add pagination
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const response = await fetch(`/api/admin/escrow/release-queue?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSubOrders(data.subOrders);
        setSummary(data.summary);
        setTotalSubOrders(data.pagination.total);
        setTotalPages(data.pagination.pages);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Failed to load escrow release queue");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(1); // Reset to first page when applying new filters
    loadEscrowQueue();
  };

  const handleResetFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setSearchQuery("");
    setStoreFilter("all");
    setPage(1);
    // Load data with reset filters
    setTimeout(() => {
      loadEscrowQueue();
    }, 0);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount / 100);
  };

  const getPriorityBadge = (daysSinceReturnWindow: number) => {
    if (daysSinceReturnWindow >= 30) {
      return (
        <Badge className="bg-red-100 text-red-800">
          Critical ({daysSinceReturnWindow}d)
        </Badge>
      );
    } else if (daysSinceReturnWindow >= 14) {
      return (
        <Badge className="bg-orange-100 text-orange-800">
          High ({daysSinceReturnWindow}d)
        </Badge>
      );
    } else if (daysSinceReturnWindow >= 7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          Medium ({daysSinceReturnWindow}d)
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-800">
          Normal ({daysSinceReturnWindow}d)
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Escrow Release Queue
          </h1>
          <p className="text-muted-foreground">
            Manage escrow fund releases to sellers
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Releases
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalPendingReleases}
              </div>
              <p className="text-xs text-muted-foreground">
                Sub-orders awaiting release
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Escrow Amount
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.totalEscrowAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Funds ready for release
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Amount
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.averageEscrowAmount)}
              </div>
              <p className="text-xs text-muted-foreground">Per sub-order</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Oldest Pending
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.oldestPendingDays}
              </div>
              <p className="text-xs text-muted-foreground">
                Days since return window
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="w-5 h-5 mr-2 text-soraxi-green" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers, stores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
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
            <div className="space-y-2">
              <Label>Store</Label>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {/* Add store options dynamically */}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end space-x-2">
              <Button
                onClick={handleApplyFilters}
                className="flex-1 bg-soraxi-green hover:bg-soraxi-green/90"
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
              <Button
                onClick={handleResetFilters}
                variant="outline"
                className="flex-1 bg-transparent"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escrow Release Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-soraxi-green" />
            Escrow Release Queue ({totalSubOrders})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub-Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-soraxi-green mb-2" />
                      <span>Loading escrow queue...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : subOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mb-2" />
                      <h3 className="font-medium text-lg">
                        No pending escrow releases
                      </h3>
                      <p className="text-muted-foreground">
                        All eligible escrows have been processed
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                subOrders.map((subOrder) => (
                  <TableRow key={subOrder.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-soraxi-green/10 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-soraxi-green" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {subOrder.subOrderNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {subOrder.orderNumber}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {subOrder.customer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {subOrder.customer.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {subOrder.store.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {subOrder.store.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span className="font-medium">
                          {formatCurrency(subOrder.escrowAmount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(
                        subOrder.deliveryInfo.daysSinceReturnWindow
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>
                          {new Date(
                            subOrder.deliveryInfo.deliveredAt
                          ).toLocaleDateString()}
                        </p>
                        <p className="text-muted-foreground">
                          {subOrder.deliveryInfo.customerConfirmed
                            ? "Customer confirmed"
                            : "Auto-confirmed"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/admin/escrow/release-queue/${subOrder.id}`}
                        >
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
          {!loading && subOrders.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalSubOrders)} of {totalSubOrders}{" "}
                sub-orders
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
