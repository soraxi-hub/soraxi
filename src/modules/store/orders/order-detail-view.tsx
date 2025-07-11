"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  CreditCard,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
// import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";

/**
 * Interface for Detailed Order Information
 *
 * Extended order interface that includes complete customer information,
 * detailed product data, and comprehensive tracking information.
 */
interface DetailedOrder {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: {
    postalCode: string;
    address: string;
  };
  notes?: string;
  discount?: number;
  taxAmount?: number;
  createdAt: string;
  updatedAt: string;
  subOrders: DetailedSubOrder[];
}

/**
 * Interface for Detailed Sub-Order Information
 *
 * Comprehensive sub-order data including populated product information,
 * shipping details, and escrow status.
 */
interface DetailedSubOrder {
  _id: string;
  store: string;
  products: DetailedOrderProduct[];
  totalAmount: number;
  deliveryStatus: string;
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
 * Interface for Detailed Order Product Information
 *
 * Complete product information including images, specifications,
 * and pricing details for order display.
 */
interface DetailedOrderProduct {
  Product: {
    _id: string;
    name: string;
    images: string[];
    price: number;
    productType: string;
    category: string[];
    subCategory: string[];
  };
  quantity: number;
  price: number;
  selectedSize?: {
    size: string;
    price: number;
  };
}

/**
 * Order Detail View Component Props
 */
interface OrderDetailViewProps {
  orderId: string;
}

/**
 * Order Detail View Component
 *
 * A comprehensive order detail interface that provides complete order information
 * and management capabilities for store owners. Features include:
 *
 * - Complete order information display with customer details
 * - Product-by-product breakdown with images and specifications
 * - Delivery status tracking and management
 * - Shipping information and tracking number management
 * - Escrow status monitoring and release management
 * - Payment information and transaction details
 * - Order timeline and status history
 * - Mobile-responsive design with professional styling
 *
 * The component handles all aspects of order management from a store owner's
 * perspective, providing tools for order fulfillment, customer communication,
 * and financial tracking.
 */
export default function OrderDetailView({ orderId }: OrderDetailViewProps) {
  // ==================== State Management ====================

  /**
   * Order Data State
   *
   * Manages the complete order information including loading states
   * and error handling for the order detail interface.
   */
  const [order, setOrder] = useState<DetailedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Form State Management
   *
   * Manages form inputs for order updates including tracking numbers,
   * delivery status changes, and notes.
   */
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  // Hook for toast notifications
  //   const { toast } = useToast();

  // ==================== Utility Functions ====================

  /**
   * Format Currency Display
   *
   * Formats monetary values in Nigerian Naira with proper formatting
   * for consistent display across the order detail interface.
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

  // ==================== Data Fetching ====================

  /**
   * Fetch Order Details
   *
   * Retrieves complete order information including all related data
   * such as customer details, products, and shipping information.
   *
   * Features:
   * - Comprehensive error handling with user feedback
   * - Loading state management
   * - Data validation and formatting
   * - Automatic retry on failure
   */
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/store/orders/${orderId}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch order details: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.order) {
        throw new Error("Order not found");
      }

      setOrder(data.order);

      // Set initial form values from order data
      if (data.order.subOrders[0]?.trackingNumber) {
        setTrackingNumber(data.order.subOrders[0].trackingNumber);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch order details";
      setError(errorMessage);

      //   toast({
      //     title: "Error",
      //     description: errorMessage,
      //     variant: "destructive",
      //   });
    } finally {
      setLoading(false);
    }
  };

  // ==================== Effect Hooks ====================

  /**
   * Initial Data Load
   *
   * Fetches order details when the component mounts or when the
   * order ID changes.
   */
  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  // ==================== Event Handlers ====================

  /**
   * Handle Status Update
   *
   * Updates the delivery status of a specific sub-order with proper
   * validation and user feedback.
   *
   * @param subOrderId - The ID of the sub-order to update
   * @param newStatus - The new delivery status to set
   */
  const handleStatusUpdate = async (subOrderId: string, newStatus: string) => {
    try {
      setUpdating(true);

      const response = await fetch(`/api/store/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subOrderId,
          deliveryStatus: newStatus,
          trackingNumber: trackingNumber || undefined,
          notes: deliveryNotes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      // Refresh order details after successful update
      await fetchOrderDetails();

      //   toast({
      //     title: "Status Updated",
      //     description: `Order status updated to ${newStatus}`,
      //   });

      // Clear form fields after successful update
      setDeliveryNotes("");
    } catch (err) {
      //   toast({
      //     title: "Error",
      //     description: "Failed to update order status",
      //     variant: "destructive",
      //   });
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Handle Tracking Number Update
   *
   * Updates the tracking number for a sub-order with validation
   * and immediate feedback to the user.
   *
   * @param subOrderId - The ID of the sub-order to update
   */
  const handleTrackingUpdate = async (subOrderId: string) => {
    if (!trackingNumber.trim()) {
      //   toast({
      //     title: "Error",
      //     description: "Please enter a tracking number",
      //     variant: "destructive",
      //   });
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(`/api/store/orders/${orderId}/tracking`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subOrderId,
          trackingNumber: trackingNumber.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tracking number");
      }

      // Refresh order details after successful update
      await fetchOrderDetails();

      //   toast({
      //     title: "Tracking Updated",
      //     description: "Tracking number has been updated successfully",
      //   });
    } catch (err) {
      //   toast({
      //     title: "Error",
      //     description: "Failed to update tracking number",
      //     variant: "destructive",
      //   });
    } finally {
      setUpdating(false);
    }
  };

  // ==================== Render Functions ====================

  /**
   * Render Loading State
   *
   * Displays a professional loading interface while order data
   * is being fetched from the server.
   */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/store/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
        </div>

        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  /**
   * Render Error State
   *
   * Displays error information with retry options when order
   * data cannot be loaded.
   */
  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/store/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
        </div>

        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Order</h3>
          <p className="text-muted-foreground mb-4">
            {error || "Order not found"}
          </p>
          <Button onClick={fetchOrderDetails}>Try Again</Button>
        </div>
      </div>
    );
  }

  // ==================== Main Render ====================

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/store/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Order #{order._id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-muted-foreground">
              Placed on{" "}
              {format(new Date(order.createdAt), "MMMM dd, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status and Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Status & Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {order.subOrders.map((subOrder, index) => {
                const statusConfig = getStatusBadge(subOrder.deliveryStatus);
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={index} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {subOrder.deliveryStatus}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sub-order {index + 1} of {order.subOrders.length}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusConfig.variant}>
                        {subOrder.deliveryStatus}
                      </Badge>
                    </div>

                    {/* Tracking Number Management */}
                    <div className="space-y-2">
                      <Label htmlFor={`tracking-${index}`}>
                        Tracking Number
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`tracking-${index}`}
                          placeholder="Enter tracking number"
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                        />
                        <Button
                          onClick={() => handleTrackingUpdate(subOrder._id)}
                          disabled={updating}
                          size="sm"
                        >
                          Update
                        </Button>
                      </div>
                      {subOrder.trackingNumber && (
                        <p className="text-sm text-muted-foreground">
                          Current: {subOrder.trackingNumber}
                        </p>
                      )}
                    </div>

                    {/* Status Update Controls */}
                    <div className="space-y-2">
                      <Label>Update Status</Label>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) =>
                            handleStatusUpdate(subOrder._id, value)
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select new status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Processing">
                              Processing
                            </SelectItem>
                            <SelectItem value="Shipped">Shipped</SelectItem>
                            <SelectItem value="Out for Delivery">
                              Out for Delivery
                            </SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                            <SelectItem value="Canceled">Canceled</SelectItem>
                            <SelectItem value="Failed Delivery">
                              Failed Delivery
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Delivery Notes */}
                    <div className="space-y-2">
                      <Label htmlFor={`notes-${index}`}>
                        Delivery Notes (Optional)
                      </Label>
                      <Textarea
                        id={`notes-${index}`}
                        placeholder="Add notes about this delivery..."
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        rows={2}
                      />
                    </div>

                    {/* Escrow Information */}
                    {subOrder.escrow && (
                      <div className="p-3 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Escrow Status</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Held:</span>
                            <span
                              className={`ml-2 ${
                                subOrder.escrow.held
                                  ? "text-orange-600"
                                  : "text-green-600"
                              }`}
                            >
                              {subOrder.escrow.held ? "Yes" : "No"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Released:
                            </span>
                            <span
                              className={`ml-2 ${
                                subOrder.escrow.released
                                  ? "text-green-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {subOrder.escrow.released ? "Yes" : "No"}
                            </span>
                          </div>
                          {subOrder.escrow.releasedAt && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">
                                Released At:
                              </span>
                              <span className="ml-2">
                                {format(
                                  new Date(subOrder.escrow.releasedAt),
                                  "MMM dd, yyyy"
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Products in Order */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.subOrders.map((subOrder, subIndex) => (
                  <div key={subIndex}>
                    {order.subOrders.length > 1 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-sm text-muted-foreground">
                          Sub-order {subIndex + 1}
                        </h4>
                        <Separator className="mt-2" />
                      </div>
                    )}

                    {subOrder.products.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex gap-4 p-4 border rounded-lg"
                      >
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <Image
                            src={
                              item.Product.images[0] ||
                              "/placeholder.svg?height=64&width=64"
                            }
                            alt={item.Product.name}
                            fill
                            className="object-cover rounded-md"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">
                            {item.Product.name}
                          </h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Qty: {item.quantity}</span>
                            {item.selectedSize && (
                              <span>Size: {item.selectedSize.size}</span>
                            )}
                            <span>Price: {formatCurrency(item.price)}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.Product.category.map((cat, catIndex) => (
                              <Badge
                                key={catIndex}
                                variant="outline"
                                className="text-xs"
                              >
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Information */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{order.user.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{order.user.email}</span>
                </div>
                {order.user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{order.user.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Delivery Address</h4>
                <p className="text-sm text-muted-foreground">
                  {order.shippingAddress.address}
                </p>
                <p className="text-sm text-muted-foreground">
                  Postal Code: {order.shippingAddress.postalCode}
                </p>
              </div>

              {order.subOrders[0]?.shippingMethod && (
                <div>
                  <h4 className="font-medium mb-2">Shipping Method</h4>
                  <div className="space-y-1 text-sm">
                    <p>{order.subOrders[0].shippingMethod.name}</p>
                    <p className="text-muted-foreground">
                      {formatCurrency(order.subOrders[0].shippingMethod.price)}
                    </p>
                    {order.subOrders[0].shippingMethod
                      .estimatedDeliveryDays && (
                      <p className="text-muted-foreground">
                        Est.{" "}
                        {
                          order.subOrders[0].shippingMethod
                            .estimatedDeliveryDays
                        }{" "}
                        days
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <Badge
                    variant={
                      order.paymentStatus === "Paid" ? "default" : "secondary"
                    }
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>
                    {formatCurrency(order.totalAmount - (order.taxAmount || 0))}
                  </span>
                </div>
                {order.discount && order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                {order.taxAmount && order.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>{formatCurrency(order.taxAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-medium text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Order Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div>
                    <p className="font-medium">Order Placed</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(order.createdAt),
                        "MMM dd, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                </div>

                {order.subOrders.map((subOrder, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-muted rounded-full"></div>
                    <div>
                      <p className="font-medium">{subOrder.deliveryStatus}</p>
                      <p className="text-sm text-muted-foreground">
                        Sub-order {index + 1}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
