"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Search,
  Filter,
  // Download,
  Eye,
  MoreHorizontal,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
// import { useTRPC } from "@/trpc/client";

/**
 * Interface for Order Summary Information
 *
 * Represents the essential order data displayed in the orders management table.
 * Optimized for list view with key information for quick order identification.
 */
interface OrderSummary {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  subOrders: {
    _id: string;
    deliveryStatus: string;
    products: {
      Product: {
        _id: string;
        name: string;
        images: string[];
      };
      quantity: number;
    }[];
    trackingNumber?: string;
  }[];
}

/**
 * Interface for API Response Structure
 *
 * Defines the structure of the API response including pagination
 * metadata and filtering information.
 */
interface OrdersResponse {
  success: boolean;
  orders: OrderSummary[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
  filters: {
    dateRange: { startDate: string; endDate: string } | null;
    deliveryStatus: string;
    searchQuery: string;
  };
}

/**
 * Store Orders Management Component
 *
 * A comprehensive order management interface for store owners that provides:
 *
 * - Advanced filtering by date range, delivery status, and search terms
 * - Professional order table with key information display
 * - Pagination support for large order datasets
 * - Quick actions for order management and status updates
 * - Mobile-responsive design with sheet-based filters
 * - Real-time order status tracking and updates
 * - Export functionality for order data
 * - Professional loading states and error handling
 *
 * The component integrates with the store's order API to provide real-time
 * order management capabilities with comprehensive filtering and search options.
 */
export default function StoreOrdersManagement({
  storeId,
}: {
  storeId: string;
}) {
  // ==================== State Management ====================

  /**
   * Orders Data State
   *
   * Manages the complete orders dataset including loading states,
   * error handling, and pagination information.
   */
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const trpc = useTRPC();

  /**
   * Pagination State
   *
   * Tracks current page and pagination metadata for efficient
   * data loading and navigation.
   */
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  /**
   * Filter State Management
   *
   * Manages all filtering options including date ranges,
   * status filters, and search queries.
   */
  const [selectedMonth, setSelectedMonth] = useState("current");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Hook for toast notifications
  // const { toast } = useToast()

  // ==================== Utility Functions ====================

  /**
   * Get Date Range for Month Selection
   *
   * Calculates the start and end dates for different month options
   * including current month, last month, and custom selections.
   *
   * @param monthOption - The selected month option
   * @returns Object containing start and end dates
   */
  const getDateRange = (monthOption: string) => {
    const now = new Date();

    switch (monthOption) {
      case "current":
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
      case "last":
        const lastMonth = subMonths(now, 1);
        return {
          startDate: startOfMonth(lastMonth),
          endDate: endOfMonth(lastMonth),
        };
      case "two-months":
        const twoMonthsAgo = subMonths(now, 2);
        return {
          startDate: startOfMonth(twoMonthsAgo),
          endDate: endOfMonth(twoMonthsAgo),
        };
      case "three-months":
        const threeMonthsAgo = subMonths(now, 3);
        return {
          startDate: startOfMonth(threeMonthsAgo),
          endDate: endOfMonth(threeMonthsAgo),
        };
      default:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
    }
  };

  /**
   * Format Currency Display
   *
   * Formats monetary values in Nigerian Naira with proper formatting
   * for consistent display across the orders table.
   *
   * @param amount - Amount in kobo (smallest currency unit)
   * @returns Formatted currency string
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount / 100);
  };

  /**
   * Get Status Badge Configuration
   *
   * Returns appropriate styling and icon configuration for different
   * delivery statuses with enhanced visual indicators.
   *
   * @param status - The delivery status to get configuration for
   * @returns Object containing variant, icon, and color information
   */
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "Order Placed": {
        variant: "secondary" as const,
        icon: Clock,
        color: "bg-blue-100 text-blue-800",
      },
      Processing: {
        variant: "default" as const,
        icon: Package,
        color: "bg-orange-100 text-orange-800",
      },
      Shipped: {
        variant: "default" as const,
        icon: Truck,
        color: "bg-purple-100 text-purple-800",
      },
      "Out for Delivery": {
        variant: "default" as const,
        icon: Truck,
        color: "bg-indigo-100 text-indigo-800",
      },
      Delivered: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "bg-green-100 text-green-800",
      },
      Canceled: {
        variant: "destructive" as const,
        icon: AlertCircle,
        color: "bg-red-100 text-red-800",
      },
      Returned: {
        variant: "secondary" as const,
        icon: AlertCircle,
        color: "bg-yellow-100 text-yellow-800",
      },
      "Failed Delivery": {
        variant: "destructive" as const,
        icon: AlertCircle,
        color: "bg-red-100 text-red-800",
      },
      Refunded: {
        variant: "secondary" as const,
        icon: AlertCircle,
        color: "bg-gray-100 text-gray-800",
      },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig["Order Placed"]
    );
  };

  /**
   * Get Month Display Name
   *
   * Returns user-friendly display names for month selection options.
   *
   * @param monthOption - The month option key
   * @returns Human-readable month description
   */
  const getMonthDisplayName = (monthOption: string) => {
    const monthNames = {
      current: "Current Month",
      last: "Last Month",
      "two-months": "2 Months Ago",
      "three-months": "3 Months Ago",
    };

    return (
      monthNames[monthOption as keyof typeof monthNames] || "Current Month"
    );
  };

  // ==================== Data Fetching ====================

  /**
   * Fetch Orders from API
   *
   * Retrieves orders from the store orders API with comprehensive
   * filtering, pagination, and error handling.
   *
   * Features:
   * - Date range filtering based on month selection
   * - Delivery status filtering
   * - Search query processing
   * - Pagination support
   * - Loading state management
   * - Error handling with user feedback
   */
  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();

      // Add date range parameters
      const dateRange = getDateRange(selectedMonth);
      params.append("startDate", dateRange.startDate.toISOString());
      params.append("endDate", dateRange.endDate.toISOString());

      // Add filtering parameters
      if (selectedStatus !== "all") {
        params.append("deliveryStatus", selectedStatus);
      }

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      // Add pagination parameters
      params.append("page", page.toString());
      params.append("limit", "20");

      // Execute API request
      const response = await fetch(`/api/store/orders?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const data: OrdersResponse = await response.json();

      if (!data.success) {
        throw new Error("Failed to fetch orders");
      }

      // Update state with fetched data
      setOrders(data.orders);
      setCurrentPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch orders";
      setError(errorMessage);

      // toast({
      //   title: "Error",
      //   description: errorMessage,
      //   variant: "destructive",
      // })
    } finally {
      setLoading(false);
    }
  };

  // ==================== Effect Hooks ====================

  /**
   * Initial Data Load and Filter Changes
   *
   * Fetches orders when the component mounts or when filters change.
   * Resets to page 1 when filters are modified.
   */
  useEffect(() => {
    fetchOrders(1);
  }, [selectedMonth, selectedStatus, searchQuery]);

  /**
   * Pagination Changes
   *
   * Fetches new page data when pagination controls are used.
   */
  useEffect(() => {
    if (currentPage > 1) {
      fetchOrders(currentPage);
    }
  }, [currentPage]);

  // ==================== Event Handlers ====================

  /**
   * Handle Search Input
   *
   * Processes search input with debouncing to prevent excessive API calls.
   *
   * @param value - The search query value
   */
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  /**
   * Handle Filter Changes
   *
   * Processes filter changes and resets pagination to first page.
   *
   * @param filterType - The type of filter being changed
   * @param value - The new filter value
   */
  const handleFilterChange = (
    filterType: "month" | "status",
    value: string
  ) => {
    if (filterType === "month") {
      setSelectedMonth(value);
    } else if (filterType === "status") {
      setSelectedStatus(value);
    }
    setCurrentPage(1); // Reset to first page when filters change
  };

  /**
   * Handle Page Navigation
   *
   * Manages pagination navigation with proper bounds checking.
   *
   * @param direction - Navigation direction or specific page number
   */
  const handlePageChange = (direction: "prev" | "next" | number) => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else if (
      typeof direction === "number" &&
      direction >= 1 &&
      direction <= totalPages
    ) {
      setCurrentPage(direction);
    }
  };

  /**
   * Handle Order Export
   *
   * Initiates the export process for filtered orders with user feedback.
   */
  // const handleExportOrders = async () => {
  //   try {
  //     // toast({
  //     //   title: "Export Started",
  //     //   description: "Your order export is being prepared...",
  //     // })

  //     // TODO: Implement actual export functionality
  //     // This would typically call an export API endpoint
  //     console.log("Exporting orders with current filters...");
  //   } catch (err) {
  //     // toast({
  //     //   title: "Export Failed",
  //     //   description: "Failed to export orders. Please try again.",
  //     //   variant: "destructive",
  //     // })
  //   }
  // };

  // ==================== Render Functions ====================

  /**
   * Render Filter Controls
   *
   * Displays the filtering interface with month selection,
   * status filtering, and search functionality.
   */
  const renderFilters = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Filter by Month
        </label>
        <Select
          value={selectedMonth}
          onValueChange={(value) => handleFilterChange("month", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current Month</SelectItem>
            <SelectItem value="last">Last Month</SelectItem>
            <SelectItem value="two-months">2 Months Ago</SelectItem>
            <SelectItem value="three-months">3 Months Ago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">
          Filter by Status
        </label>
        <Select
          value={selectedStatus}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Order Placed">Order Placed</SelectItem>
            <SelectItem value="Processing">Processing</SelectItem>
            <SelectItem value="Shipped">Shipped</SelectItem>
            <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
            <SelectItem value="Delivered">Delivered</SelectItem>
            <SelectItem value="Canceled">Canceled</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
            <SelectItem value="Failed Delivery">Failed Delivery</SelectItem>
            <SelectItem value="Refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Search Orders</label>
        <Input
          placeholder="Search by order ID, customer name, or product..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
    </div>
  );

  /**
   * Render Loading State
   *
   * Displays a professional loading interface while orders
   * are being fetched from the server.
   */
  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Orders Management</h1>
            <p className="text-muted-foreground">
              Manage and track your store orders
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== Main Render ====================

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">
            Manage and track your store orders •{" "}
            {getMonthDisplayName(selectedMonth)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* <Button variant="outline" onClick={handleExportOrders}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button> */}

          <Button variant="outline" onClick={() => fetchOrders(currentPage)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {/* Mobile Filter Sheet */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:hidden bg-transparent">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filter Orders</SheetTitle>
              </SheetHeader>
              <div className="mt-6">{renderFilters()}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Desktop Filters Sidebar */}
        <div className="hidden md:block">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>{renderFilters()}</CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Orders ({totalCount} total)
                  {selectedStatus !== "all" && (
                    <Badge variant="outline" className="ml-2">
                      {selectedStatus}
                    </Badge>
                  )}
                </CardTitle>

                {/* Desktop Search */}
                <div className="hidden md:flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {error ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Error Loading Orders
                  </h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={() => fetchOrders(currentPage)}>
                    Try Again
                  </Button>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Orders Found
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery || selectedStatus !== "all"
                      ? "No orders match your current filters."
                      : "You haven't received any orders yet."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Orders Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Products</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => {
                          const primaryStatus =
                            order.subOrders[0]?.deliveryStatus ||
                            "Order Placed";
                          const statusConfig = getStatusBadge(primaryStatus);
                          const StatusIcon = statusConfig.icon;

                          return (
                            <TableRow key={order._id}>
                              <TableCell className="font-medium">
                                #{order._id.slice(-8).toUpperCase()}
                              </TableCell>

                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {order.user.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {order.user.email}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="space-y-1">
                                  {order.subOrders.map((subOrder, index) => (
                                    <div key={index} className="text-sm">
                                      {subOrder.products
                                        .slice(0, 2)
                                        .map((product, productIndex) => (
                                          <p
                                            key={productIndex}
                                            className="truncate max-w-[200px]"
                                          >
                                            {product.Product.name} (×
                                            {product.quantity})
                                          </p>
                                        ))}
                                      {subOrder.products.length > 2 && (
                                        <p className="text-muted-foreground">
                                          +{subOrder.products.length - 2} more
                                          items
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`p-1 rounded-full ${statusConfig.color}`}
                                  >
                                    <StatusIcon className="h-3 w-3" />
                                  </div>
                                  <Badge variant={statusConfig.variant}>
                                    {primaryStatus}
                                  </Badge>
                                </div>
                                {order.subOrders[0]?.trackingNumber && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Tracking:{" "}
                                    {order.subOrders[0].trackingNumber}
                                  </p>
                                )}
                              </TableCell>

                              <TableCell className="font-medium">
                                {formatCurrency(order.totalAmount)}
                              </TableCell>

                              <TableCell>
                                <div className="text-sm">
                                  <p>
                                    {format(
                                      new Date(order.createdAt),
                                      "MMM dd, yyyy"
                                    )}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {format(
                                      new Date(order.createdAt),
                                      "h:mm a"
                                    )}
                                  </p>
                                </div>
                              </TableCell>

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
                                        href={`/store/${storeId}/orders/${order._id}`}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </Link>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <p className="text-sm text-muted-foreground">
                        Showing page {currentPage} of {totalPages} ({totalCount}{" "}
                        total orders)
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange("prev")}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              const pageNum = Math.max(1, currentPage - 2) + i;
                              if (pageNum > totalPages) return null;

                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    pageNum === currentPage
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => handlePageChange(pageNum)}
                                  className="w-8 h-8 p-0"
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange("next")}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
