"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Filter,
  Eye,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
// import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

/**
 * Interface for Order Data Structure
 *
 * Represents the complete order information as received from the API,
 * including sub-orders, products, and delivery tracking information.
 */
interface OrderData {
  _id: string;
  user: {
    _id: string;
    name?: string;
    email?: string;
  };
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: {
    postalCode: string;
    address: string;
  };
  createdAt: string;
  updatedAt: string;
  subOrders: SubOrder[];
}

/**
 * Interface for Sub-Order Structure
 *
 * Each order can contain multiple sub-orders for different stores.
 * This interface represents the store-specific portion of an order.
 */
interface SubOrder {
  _id: string;
  store: string;
  products: OrderProduct[];
  totalAmount: number;
  deliveryStatus:
    | "Order Placed"
    | "Processing"
    | "Shipped"
    | "Out for Delivery"
    | "Delivered"
    | "Canceled"
    | "Returned"
    | "Failed Delivery"
    | "Refunded";
  shippingMethod?: {
    name: string;
    price: number;
    estimatedDeliveryDays?: string;
    description?: string;
  };
  trackingNumber?: string;
  deliveryDate?: string;
  escrow: {
    held: boolean;
    released: boolean;
    releasedAt?: string;
    refunded: boolean;
    refundReason?: string;
  };
  returnWindow?: string;
}

/**
 * Interface for Order Product Structure
 *
 * Represents individual products within a sub-order,
 * including quantity, pricing, and size information.
 */
interface OrderProduct {
  Product: {
    _id: string;
    name: string;
    images: string[];
    price: number;
    productType: string;
  };
  quantity: number;
  price: number;
  selectedSize?: {
    size: string;
    price: number;
  };
}

/**
 * Interface for Order Filters
 *
 * Defines the available filtering options for order management,
 * including date ranges and delivery status filtering.
 */
interface OrderFilters {
  dateRange: "current" | "last" | "custom";
  customMonth?: Date;
  deliveryStatus: string;
  searchQuery: string;
}

/**
 * Store Orders Management Component
 *
 * A comprehensive order management interface for store owners that provides:
 * - Monthly order filtering with custom date selection
 * - Delivery status filtering and management
 * - Order search functionality
 * - Detailed order information display
 * - Order status update capabilities
 * - Mobile-responsive design with sheet-based filters
 *
 * Features:
 * - Real-time order data fetching with loading states
 * - Professional order status badges with color coding
 * - Comprehensive error handling and user feedback
 * - Modular component architecture for maintainability
 * - Responsive design optimized for all screen sizes
 */
export default function StoreOrdersManagement({
  storeId,
}: {
  storeId: string;
}) {
  // ==================== State Management ====================

  /**
   * Orders State Management
   *
   * Manages the complete list of orders, loading states, and error handling
   * for the order management interface.
   */
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Filter State Management
   *
   * Manages all filtering options including date ranges, delivery status,
   * and search queries for comprehensive order filtering.
   */
  const [filters, setFilters] = useState<OrderFilters>({
    dateRange: "current",
    deliveryStatus: "all",
    searchQuery: "",
  });

  /**
   * UI State Management
   *
   * Manages mobile filter sheet visibility and other UI-related states
   * for responsive design implementation.
   */
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Hook for toast notifications
  //   const { toast } = useToast();

  // ==================== Utility Functions ====================

  /**
   * Get Delivery Status Badge Configuration
   *
   * Returns appropriate styling and icon configuration for different
   * delivery statuses to provide visual consistency across the interface.
   *
   * @param status - The delivery status to get configuration for
   * @returns Object containing variant, icon, and color information
   */
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "Order Placed": {
        variant: "secondary" as const,
        icon: Clock,
        color: "text-blue-600",
      },
      Processing: {
        variant: "default" as const,
        icon: Package,
        color: "text-orange-600",
      },
      Shipped: {
        variant: "default" as const,
        icon: Truck,
        color: "text-purple-600",
      },
      "Out for Delivery": {
        variant: "default" as const,
        icon: Truck,
        color: "text-indigo-600",
      },
      Delivered: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600",
      },
      Canceled: {
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-red-600",
      },
      Returned: {
        variant: "secondary" as const,
        icon: AlertCircle,
        color: "text-yellow-600",
      },
      "Failed Delivery": {
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-red-600",
      },
      Refunded: {
        variant: "secondary" as const,
        icon: AlertCircle,
        color: "text-gray-600",
      },
    };

    return (
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig["Order Placed"]
    );
  };

  /**
   * Format Currency Display
   *
   * Formats monetary values in Nigerian Naira with proper formatting
   * for consistent display across the interface.
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
   * Get Date Range for Filtering
   *
   * Calculates the appropriate date range based on the selected filter option
   * to ensure accurate order filtering by date.
   *
   * @param filterType - The type of date filter to apply
   * @param customDate - Custom date for specific month filtering
   * @returns Object containing start and end dates
   */
  const getDateRange = (filterType: string, customDate?: Date) => {
    const now = new Date();

    switch (filterType) {
      case "current":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      case "last":
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        };
      case "custom":
        if (customDate) {
          return {
            start: startOfMonth(customDate),
            end: endOfMonth(customDate),
          };
        }
        return getDateRange("current");
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
    }
  };

  // ==================== Data Fetching ====================

  /**
   * Fetch Store Orders
   *
   * Retrieves orders for the current store based on applied filters.
   * Implements comprehensive error handling and loading state management
   * for optimal user experience.
   *
   * Features:
   * - Date range filtering with flexible options
   * - Delivery status filtering
   * - Search query implementation
   * - Error handling with user-friendly messages
   * - Loading state management
   */
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range based on current filters
      const dateRange = getDateRange(filters.dateRange, filters.customMonth);

      // Build query parameters for API request
      const queryParams = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        ...(filters.deliveryStatus !== "all" && {
          deliveryStatus: filters.deliveryStatus,
        }),
        ...(filters.searchQuery && { search: filters.searchQuery }),
      });

      // Make API request to fetch filtered orders
      const response = await fetch(`/api/store/orders?${queryParams}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.statusText}`);
      }

      const data = await response.json();

      // Update orders state with fetched data
      setOrders(data.orders || []);

      // Show success feedback for data refresh
      if (data.orders?.length === 0) {
        // toast({
        //   title: "No Orders Found",
        //   description: "No orders match your current filters.",
        // });
      }
    } catch (err) {
      // Handle and display errors appropriately
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch orders";
      setError(errorMessage);

      //   toast({
      //     title: "Error",
      //     description: errorMessage,
      //     variant: "destructive",
      //   });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ==================== Effect Hooks ====================

  /**
   * Initial Data Load and Filter Change Handler
   *
   * Automatically fetches orders when the component mounts or when
   * filters change, ensuring data is always up-to-date.
   */
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ==================== Event Handlers ====================

  /**
   * Handle Filter Changes
   *
   * Updates filter state and triggers data refetch when filters are modified.
   * Provides immediate feedback to user actions.
   *
   * @param key - The filter key to update
   * @param value - The new filter value
   */
  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  /**
   * Handle Order Status Update
   *
   * Updates the delivery status of a specific sub-order and refreshes
   * the order list to reflect changes immediately.
   *
   * @param orderId - The ID of the order containing the sub-order
   * @param subOrderId - The ID of the sub-order to update
   * @param newStatus - The new delivery status to set
   */
  const handleStatusUpdate = async (
    orderId: string,
    subOrderId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/store/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subOrderId,
          deliveryStatus: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      // Refresh orders after successful update
      await fetchOrders();

      //   toast({
      //     title: "Status Updated",
      //     description: `Order status updated to ${newStatus}`,
      //   });
    } catch (err) {
      //   toast({
      //     title: "Error",
      //     description: "Failed to update order status",
      //     variant: "destructive",
      //   });
    }
  };

  // ==================== Render Functions ====================

  /**
   * Render Filter Controls
   *
   * Renders the complete set of filter controls including date range selection,
   * delivery status filtering, and search functionality.
   *
   * @returns JSX element containing all filter controls
   */
  const renderFilters = () => (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date Range</label>
        <Select
          value={filters.dateRange}
          onValueChange={(value) => handleFilterChange("dateRange", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current Month</SelectItem>
            <SelectItem value="last">Last Month</SelectItem>
            <SelectItem value="custom">Custom Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom Month Selector */}
      {filters.dateRange === "custom" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Month</label>
          <Input
            type="month"
            value={
              filters.customMonth ? format(filters.customMonth, "yyyy-MM") : ""
            }
            onChange={(e) =>
              handleFilterChange("customMonth", new Date(e.target.value))
            }
          />
        </div>
      )}

      {/* Delivery Status Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Delivery Status</label>
        <Select
          value={filters.deliveryStatus}
          onValueChange={(value) => handleFilterChange("deliveryStatus", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
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

      {/* Search Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Search Orders</label>
        <Input
          placeholder="Search by order ID, customer, or product..."
          value={filters.searchQuery}
          onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
        />
      </div>
    </div>
  );

  /**
   * Render Order Row
   *
   * Renders a single order row in the orders table with all relevant
   * information and action buttons.
   *
   * @param order - The order data to render
   * @returns JSX element representing the order row
   */
  const renderOrderRow = (order: OrderData) => {
    // Calculate total items across all sub-orders
    const totalItems = order.subOrders.reduce(
      (sum, subOrder) =>
        sum +
        subOrder.products.reduce(
          (productSum, product) => productSum + product.quantity,
          0
        ),
      0
    );

    return (
      <TableRow key={order._id}>
        <TableCell className="font-medium">
          #{order._id.slice(-8).toUpperCase()}
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <p className="font-medium">{order.user.name || "N/A"}</p>
            <p className="text-sm text-muted-foreground">
              {order.user.email || "N/A"}
            </p>
          </div>
        </TableCell>
        <TableCell>{totalItems} items</TableCell>
        <TableCell className="font-medium">
          {formatCurrency(order.totalAmount)}
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            {order.subOrders.map((subOrder, index) => {
              const statusConfig = getStatusBadge(subOrder.deliveryStatus);
              const StatusIcon = statusConfig.icon;

              return (
                <div key={index} className="flex items-center gap-2">
                  <Badge
                    variant={statusConfig.variant}
                    className="flex items-center gap-1"
                  >
                    <StatusIcon className="h-3 w-3" />
                    {subOrder.deliveryStatus}
                  </Badge>
                  {order.subOrders.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      ({index + 1}/{order.subOrders.length})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </TableCell>
        <TableCell>
          {format(new Date(order.createdAt), "MMM dd, yyyy")}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {/* View Order Details */}
            <Button variant="outline" size="sm" asChild>
              <Link href={`/store/${storeId}/orders/${order._id}`}>
                <Eye className="h-4 w-4 mr-1" />
                View
              </Link>
            </Button>

            {/* Status Update Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {order.subOrders.map((subOrder, index) => (
                  <div key={index}>
                    {index > 0 && <Separator className="my-1" />}
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      Sub-order {index + 1}
                    </div>
                    {[
                      "Processing",
                      "Shipped",
                      "Out for Delivery",
                      "Delivered",
                      "Canceled",
                    ].map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() =>
                          handleStatusUpdate(order._id, subOrder._id, status)
                        }
                        disabled={subOrder.deliveryStatus === status}
                      >
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // ==================== Main Render ====================

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">
            Manage and track your store orders
          </p>
        </div>

        {/* Mobile Filter Button */}
        <div className="flex items-center gap-2 sm:hidden">
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
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
        <div className="hidden lg:block">
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
                <CardTitle>Orders</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchOrders}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Refresh"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Error Loading Orders
                  </h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={fetchOrders}>Try Again</Button>
                </div>
              ) : loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Orders Found
                  </h3>
                  <p className="text-muted-foreground">
                    No orders match your current filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{orders.map(renderOrderRow)}</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
