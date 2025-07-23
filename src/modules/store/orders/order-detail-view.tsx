"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  User,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { formatNaira } from "@/lib/utils/naira";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { isPopulatedUser } from "@/lib/utils/order-formatter";
import { getStatusBadge } from "@/lib/utils";

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
  const trpc = useTRPC();

  /**
   * Form State Management
   *
   * Manages form inputs for order updates including tracking numbers,
   * delivery status changes, and notes.
   */
  const [updating, setUpdating] = useState(false);

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
  const {
    data,
    isLoading: loading,
    refetch: refetchOrder,
    error,
  } = useSuspenseQuery(
    trpc.storeOrders.getStoreOrderById.queryOptions({ orderId })
  );

  const { order } = data;

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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      // Refresh order details after successful update
      refetchOrder();

      toast.success(`Order status updated to ${newStatus}`);
    } catch (err) {
      toast.error(`Failed to update order status`);
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
            {error?.message || "Order not found"}
          </p>
          <Button onClick={() => refetchOrder}>Try Again</Button>
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
                    {/* <div className="space-y-2">
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
                    </div> */}

                    {/* Status Update Controls */}
                    <SellerStatusUpdate
                      subOrder={subOrder}
                      updating={updating}
                      handleStatusUpdateAction={handleStatusUpdate}
                    />

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
                            <span>Price: {formatNaira(item.price)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-medium">
                            {formatNaira(item.price * item.quantity)}
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
                {isPopulatedUser(order.user) && order.user.firstName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {order.user.firstName} {order.user.lastName}
                    </span>
                  </div>
                )}
                {isPopulatedUser(order.user) && order.user.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{order.user.email}</span>
                  </div>
                )}
                {isPopulatedUser(order.user) && order.user.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{order.user.phoneNumber}</span>
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
                  {order.shippingAddress?.address || "Unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Postal Code: {order.shippingAddress?.postalCode || "Unknown"}
                </p>
              </div>

              {order.subOrders[0]?.shippingMethod && (
                <div>
                  <h4 className="font-medium mb-2">Shipping Method</h4>
                  <div className="space-y-1 text-sm">
                    <p>{order.subOrders[0].shippingMethod.name}</p>
                    <p className="text-muted-foreground">
                      {formatNaira(order.subOrders[0].shippingMethod.price)}
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
                <div className="flex justify-between font-medium text-lg">
                  <span>Total:</span>
                  <span>{formatNaira(order.totalAmount)}</span>
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

// All possible delivery statuses
const allStatuses = [
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Canceled",
  "Failed Delivery",
];

// Valid transitions from each current status
const allowedNextStatuses: Record<string, string[]> = {
  "Order Placed": ["Processing", "Canceled"],
  Processing: ["Shipped", "Canceled"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered", "Failed Delivery"],
  "Failed Delivery": ["Delivered"], // if seller reattempts delivery
};

interface Props {
  subOrder: {
    _id: string;
    deliveryStatus: string;
  };
  updating: boolean;
  handleStatusUpdateAction: (id: string, value: string) => void;
}

function SellerStatusUpdate({
  subOrder,
  updating,
  handleStatusUpdateAction,
}: Props) {
  const currentStatus = subOrder.deliveryStatus;
  const validStatuses = allowedNextStatuses[currentStatus] ?? [];

  const disableEntireSelect = ["Delivered", "Canceled"].includes(currentStatus);

  // Explanation message
  const explanationMessage = disableEntireSelect
    ? `This order is already marked as "${currentStatus}". Further updates are disabled.`
    : "Only valid status transitions are enabled based on the current order state.";

  return (
    <div className="space-y-2">
      <Label>Update Status</Label>
      <div className="flex gap-2">
        <Select
          onValueChange={(value) =>
            handleStatusUpdateAction(subOrder._id, value)
          }
          disabled={disableEntireSelect || updating}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select new status" />
          </SelectTrigger>
          <SelectContent>
            {allStatuses.map((status) => (
              <SelectItem
                key={status}
                value={status}
                disabled={!validStatuses.includes(status)}
              >
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <span className="text-sm text-muted-foreground block">
        {explanationMessage}
      </span>
    </div>
  );
}
