"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Search,
  Filter,
  Receipt,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";

/**
 * Transaction History Component
 *
 * Displays comprehensive wallet transaction history with advanced filtering,
 * search capabilities, and pagination. Provides detailed transaction information
 * with professional formatting and user-friendly interface.
 *
 * Features:
 * - Advanced filtering by type, source, and date range
 * - Real-time search across transaction descriptions
 * - Pagination with configurable page sizes
 * - Professional transaction formatting
 * - Export functionality for accounting purposes
 * - Responsive design for all device types
 */

interface TransactionFilters {
  type: "credit" | "debit" | "all";
  source: "order" | "withdrawal" | "refund" | "adjustment" | "all";
  dateRange: string;
  search: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalTransactions: number;
  pageSize: number;
}

export function TransactionHistory() {
  const trpc = useTRPC();
  const [filters, setFilters] = useState<TransactionFilters>({
    type: "all",
    source: "all",
    dateRange: "30",
    search: "",
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalTransactions: 0,
    pageSize: 10,
  });

  const {
    data,
    refetch: loadTransactions,
    isLoading: loading,
  } = useQuery(
    trpc.storeWalletTransactions.getTransactions.queryOptions({
      page: pagination.currentPage,
      limit: pagination.pageSize,
      type: filters.type !== "all" ? filters.type : undefined,
      source: filters.source !== "all" ? filters.source : undefined,
      days: filters.dateRange !== "all" ? Number(filters.dateRange) : undefined,
      search: filters.search.trim() !== "" ? filters.search : undefined,
    })
  );

  const transactions = data?.transactions || [];

  // Update pagination when data changes
  useEffect(() => {
    if (data) {
      setPagination((prev) => ({
        ...prev,
        totalPages: data.pagination.totalPages,
        totalTransactions: data.pagination.totalTransactions,
      }));
    }
  }, [data]);

  useEffect(() => {
    loadTransactions();
  }, [filters, pagination.currentPage, pagination.pageSize]);

  /**
   * Handle filter changes
   * Updates filters and resets pagination to first page
   */
  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  /**
   * Handle pagination changes
   * Updates current page and triggers data reload
   */
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  /**
   * Get transaction type badge with appropriate styling
   * Returns colored badge based on transaction type
   */
  const getTypeBadge = (type: string) => {
    const isCredit = type === "credit";
    return (
      <Badge
        variant={isCredit ? "default" : "destructive"}
        className={
          isCredit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }
      >
        {isCredit ? (
          <ArrowUpCircle className="w-3 h-3 mr-1" />
        ) : (
          <ArrowDownCircle className="w-3 h-3 mr-1" />
        )}
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  /**
   * Get source badge with appropriate styling
   * Returns colored badge based on transaction source
   */
  const getSourceBadge = (source: string) => {
    const colors = {
      order: "bg-blue-100 text-blue-800",
      withdrawal: "bg-purple-100 text-purple-800",
      refund: "bg-orange-100 text-orange-800",
      adjustment: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge
        variant="outline"
        className={colors[source as keyof typeof colors]}
      >
        {source.charAt(0).toUpperCase() + source.slice(1)}
      </Badge>
    );
  };

  /**
   * Export transactions to CSV
   * Downloads filtered transaction data as CSV file
   */
  // const handleExportTransactions = async () => {
  //   try {
  //     const params = new URLSearchParams({
  //       export: "csv",
  //       ...(filters.type !== "all" && { type: filters.type }),
  //       ...(filters.source !== "all" && { source: filters.source }),
  //       ...(filters.dateRange !== "all" && { days: filters.dateRange }),
  //       ...(filters.search && { search: filters.search }),
  //     });

  //     const response = await fetch(
  //       `/api/store/wallet/transactions/export?${params}`
  //     );

  //     if (response.ok) {
  //       const blob = await response.blob();
  //       const url = window.URL.createObjectURL(blob);
  //       const a = document.createElement("a");
  //       a.href = url;
  //       a.download = `transactions-${
  //         new Date().toISOString().split("T")[0]
  //       }.csv`;
  //       document.body.appendChild(a);
  //       a.click();
  //       window.URL.revokeObjectURL(url);
  //       document.body.removeChild(a);

  //       // toast({
  //       //   title: "Success",
  //       //   description: "Transactions exported successfully",
  //       // })
  //     } else {
  //       throw new Error("Failed to export transactions");
  //     }
  //   } catch (error) {
  //     // toast({
  //     //   title: "Error",
  //     //   description: "Failed to export transactions",
  //     //   variant: "destructive",
  //     // })
  //   }
  // };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Transaction Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => handleFilterChange("type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction Source */}
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={filters.source}
                onValueChange={(value) => handleFilterChange("source", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) =>
                  handleFilterChange("dateRange", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="flex space-x-2">
              <Button
                onClick={() => loadTransactions()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              {/* <Button
                onClick={handleExportTransactions}
                variant="outline"
                size="sm"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Export CSV
              </Button> */}
            </div>
            <div className="text-sm text-muted-foreground">
              {pagination.totalTransactions} total transactions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Order ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-16"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-20"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-24 ml-auto"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted rounded animate-pulse w-16"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No transactions found
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction._id}>
                    <TableCell>
                      <div className="text-sm">
                        <p>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(transaction.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                    <TableCell>{getSourceBadge(transaction.source)}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm truncate">
                          {transaction.description ||
                            `${transaction.source} transaction`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-medium ${
                          transaction.type === "credit"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "credit" ? "+" : "-"}
                        {formatNaira(transaction.amount, {
                          showDecimals: true,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {transaction.relatedOrderId ? (
                        <Button variant="link" size="sm" className="p-0 h-auto">
                          #{transaction.relatedOrderId.slice(-8)}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.currentPage - 1) * pagination.pageSize + 1}{" "}
                to{" "}
                {Math.min(
                  pagination.currentPage * pagination.pageSize,
                  pagination.totalTransactions
                )}{" "}
                of {pagination.totalTransactions} transactions
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={
                            pagination.currentPage === page
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    }
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
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
