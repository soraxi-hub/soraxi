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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  MoreHorizontal,
  Eye,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  DollarSign,
  User,
  Store,
  Search,
  Filter,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";

/**
 * Order Monitoring Component
 * Interface for monitoring and managing customer orders
 */

interface OrderData {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  status:
    | "Order Placed"
    | "Processing"
    | "Shipped"
    | "Out for Delivery"
    | "Delivered"
    | "Canceled"
    | "Returned"
    | "Failed Delivery"
    | "Refunded";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  totalAmount: number;
  shippingAddress: {
    postalCode: string;
    address: string;
  };
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  notes?: string;
}

export function OrderMonitoring() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadOrders();
  }, [statusFilter, page, limit]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Add filters to params
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (fromDate) params.append("fromDate", fromDate.toISOString());
      if (toDate) params.append("toDate", toDate.toISOString());
      if (searchQuery) params.append("search", searchQuery);

      // Add pagination
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      const response = await fetch(`/api/admin/orders?${params}`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders);
        setTotalOrders(data.pagination.total);
        setTotalPages(data.pagination.pages);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAction = async (
    orderId: string,
    action: string,
    subOrderId?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, subOrderId }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        loadOrders();
        setSelectedOrder(null);
        setShowOrderDetails(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      "Order Placed": "bg-yellow-100 text-yellow-800",
      Processing: "bg-blue-100 text-blue-800",
      Shipped: "bg-purple-100 text-purple-800",
      "Out for Delivery": "bg-indigo-100 text-indigo-800",
      Delivered: "bg-green-100 text-green-800",
      Canceled: "bg-red-100 text-red-800",
      Returned: "bg-orange-100 text-orange-800",
      "Failed Delivery": "bg-gray-100 text-gray-800",
      Refunded: "bg-pink-100 text-pink-800",
    };

    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      refunded: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleApplyFilters = () => {
    setPage(1); // Reset to first page when applying new filters
    loadOrders();
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setFromDate(undefined);
    setToDate(undefined);
    setSearchQuery("");
    setPage(1);
    // Load orders with reset filters
    setTimeout(() => {
      loadOrders();
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
          <h1 className="text-3xl font-bold text-foreground">
            Order Monitoring
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage customer orders
          </p>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Order Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Order Placed">Order Placed</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Out for Delivery">
                    Out for Delivery
                  </SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Canceled">Canceled</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                  <SelectItem value="Failed Delivery">
                    Failed Delivery
                  </SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
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

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2 text-soraxi-green" />
            Orders ({totalOrders})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-soraxi-green mb-2" />
                      <span>Loading orders...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground mb-2" />
                      <h3 className="font-medium text-lg">No orders found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your filters or search criteria
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-soraxi-green/10 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-soraxi-green" />
                        </div>
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length} item
                            {order.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {order.customer.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.customer.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {order.store.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.store.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span className="font-medium">
                          {(order.totalAmount / 100).toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {getPaymentBadge(order.paymentStatus)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
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
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowOrderDetails(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {order.status === "Order Placed" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleOrderAction(order.id, "confirm")
                              }
                              className="text-green-600"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Confirm Order
                            </DropdownMenuItem>
                          )}
                          {["Order Placed", "Processing"].includes(
                            order.status
                          ) && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleOrderAction(order.id, "cancel")
                              }
                              className="text-red-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                          {order.status === "Processing" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleOrderAction(order.id, "ship")
                              }
                              className="text-blue-600"
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              Mark Shipped
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && orders.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalOrders)} of {totalOrders} orders
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

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2 text-soraxi-green" />
              Order Details
            </DialogTitle>
            <DialogDescription>
              Complete information for order {selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Order Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">
                        Order Number
                      </Label>
                      <p className="text-sm">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Payment Status
                      </Label>
                      <div className="mt-1">
                        {getPaymentBadge(selectedOrder.paymentStatus)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Total Amount
                      </Label>
                      <p className="text-sm font-medium">
                        ${(selectedOrder.totalAmount / 100).toFixed(2)}
                      </p>
                    </div>
                    {selectedOrder.trackingNumber && (
                      <div>
                        <Label className="text-sm font-medium">
                          Tracking Number
                        </Label>
                        <p className="text-sm">
                          {selectedOrder.trackingNumber}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm">{selectedOrder.customer.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm">{selectedOrder.customer.email}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Store</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Store Name</Label>
                      <p className="text-sm">{selectedOrder.store.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Store Email</Label>
                      <p className="text-sm">{selectedOrder.store.email}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-4 p-3 border border-border rounded-lg"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} × $
                            {(item.price / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ${((item.quantity * item.price) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <p>{selectedOrder.shippingAddress.address}</p>
                    <p>
                      Postal Code: {selectedOrder.shippingAddress.postalCode}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {selectedOrder.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-end">
                {selectedOrder.status === "Order Placed" && (
                  <Button
                    onClick={() =>
                      handleOrderAction(selectedOrder.id, "confirm")
                    }
                    className="bg-soraxi-green hover:bg-soraxi-green/90"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Order
                  </Button>
                )}
                {selectedOrder.status === "Processing" && (
                  <Button
                    onClick={() => handleOrderAction(selectedOrder.id, "ship")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Mark Shipped
                  </Button>
                )}
                {["Order Placed", "Processing"].includes(
                  selectedOrder.status
                ) && (
                  <Button
                    onClick={() =>
                      handleOrderAction(selectedOrder.id, "cancel")
                    }
                    variant="destructive"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Order
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowOrderDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
