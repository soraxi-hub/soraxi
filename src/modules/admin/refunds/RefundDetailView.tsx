"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Package,
  User,
  Store,
  MapPin,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  Truck,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { useTRPC } from "@/trpc/client";
import { formatNaira } from "@/lib/utils/naira";
import { useQuery } from "@tanstack/react-query";

/**
 * Refund Detail View Component Props
 */
interface RefundDetailViewProps {
  subOrderId: string;
}

/**
 * Refund Detail View Component
 *
 * A comprehensive refund detail interface that provides complete information
 * about a sub-order requiring refund approval. Features include:
 *
 * - Complete sub-order information with customer and store details
 * - Product-by-product breakdown with images and specifications
 * - Escrow status and financial information
 * - Delivery and shipping information
 * - Order timeline and status history
 * - Refund approval actions
 * - Mobile-responsive design with professional styling
 *
 * The component handles all aspects of refund review from an admin's
 * perspective, providing tools for refund approval, customer communication,
 * and financial tracking.
 */
export default function RefundDetailView({
  subOrderId,
}: RefundDetailViewProps) {
  // ==================== State Management ====================
  const trpc = useTRPC();

  // ==================== Utility Functions ====================

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

  // ==================== Data Fetching ====================
  const {
    data,
    error,
    isLoading: loading,
    refetch: fetchRefundItemDetails,
  } = useQuery(
    trpc.adminRefundDetail.getRefundItemDetail.queryOptions({ subOrderId })
  );
  const refundItem = data?.refundItem || null;
  // ==================== Effect Hooks ====================

  /**
   * Initial Data Load
   *
   * Fetches refund item details when the component mounts or when the
   * sub-order ID changes.
   */
  useEffect(() => {
    if (subOrderId) {
      fetchRefundItemDetails();
    }
  }, [subOrderId]);

  // ==================== Render Functions ====================

  /**
   * Render Loading State
   *
   * Displays a professional loading interface while refund item data
   * is being fetched from the server.
   */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/refunds/queue">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Refund Queue
            </Link>
          </Button>
        </div>

        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-soraxi-green mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Loading refund item details...
          </p>
        </div>
      </div>
    );
  }

  /**
   * Render Error State
   *
   * Displays error information with retry options when refund item
   * data cannot be loaded.
   */
  if (error || !refundItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/refunds/queue">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Refund Queue
            </Link>
          </Button>
        </div>

        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Error Loading Refund Item
          </h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Refund item not found"}
          </p>
          <Button
            onClick={() => fetchRefundItemDetails()}
            className="bg-soraxi-green hover:bg-soraxi-green/90"
          >
            Try Again
          </Button>
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
            <Link href="/admin/refunds/queue">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Refund Queue
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              Refund Details
            </h1>
            <p className="text-muted-foreground">
              Sub-Order #{refundItem.subOrderId.substring(0, 8).toUpperCase()} •
              Order {refundItem.orderNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Refund Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Refund Status and Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-soraxi-green" />
                Refund Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Current Status</h4>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(refundItem.deliveryStatus)}
                    <span className="text-sm text-muted-foreground">
                      Requested on{" "}
                      {format(
                        new Date(refundItem.refundRequestDate),
                        "MMM dd, yyyy"
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Refund Amount</h4>
                  <p className="text-2xl font-bold text-soraxi-green">
                    {formatNaira(refundItem.subOrderAmount)}
                  </p>
                </div>
              </div>

              {/* Escrow Information */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-yellow-600" />
                  Escrow Status
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Held:</span>
                    <span
                      className={`ml-2 font-medium ${
                        refundItem.escrow.held
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      {refundItem.escrow.held ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Released:</span>
                    <span
                      className={`ml-2 font-medium ${
                        refundItem.escrow.released
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {refundItem.escrow.released ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Refunded:</span>
                    <span
                      className={`ml-2 font-medium ${
                        refundItem.escrow.refunded
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}
                    >
                      {refundItem.escrow.refunded ? "Yes" : "No"}
                    </span>
                  </div>
                  {refundItem.escrow.refundReason && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="ml-2">
                        {refundItem.escrow.refundReason}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button className="bg-soraxi-green hover:bg-soraxi-green/90">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Refund
                </Button>
                <Button variant="destructive">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Refund
                </Button>
                <Button variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Customer
                </Button>
                <Button variant="outline">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Store
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products in Sub-Order */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products in Sub-Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {refundItem.products.map((product, index) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={
                          product.images[0] ||
                          "/placeholder.svg?height=64&width=64"
                        }
                        alt={product.name}
                        fill
                        className="object-cover rounded-md"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Qty: {product.quantity}</span>
                        {product.selectedSize && (
                          <span>Size: {product.selectedSize.size}</span>
                        )}
                        <span>Price: {formatNaira(product.price)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.category.map((cat, catIndex) => (
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
                        {formatNaira(product.totalPrice)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.productType}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sub-Order Total */}
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <span className="font-medium">Sub-Order Total:</span>
                <span className="text-lg font-bold">
                  {formatNaira(refundItem.subOrderAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Delivery Status</h4>
                  {getStatusBadge(refundItem.deliveryStatus)}
                </div>
                {refundItem.deliveryDate && (
                  <div>
                    <h4 className="font-medium mb-2">Delivery Date</h4>
                    <p className="text-sm">
                      {format(
                        new Date(refundItem.deliveryDate),
                        "MMM dd, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                )}
              </div>

              {refundItem.shippingMethod && (
                <div>
                  <h4 className="font-medium mb-2">Shipping Method</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">
                      {refundItem.shippingMethod.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatNaira(refundItem.shippingMethod.price)}
                      {refundItem.shippingMethod.estimatedDeliveryDays &&
                        ` • Est. ${refundItem.shippingMethod.estimatedDeliveryDays} days`}
                    </p>
                    {refundItem.shippingMethod.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {refundItem.shippingMethod.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {refundItem.customerConfirmedDelivery && (
                <div>
                  <h4 className="font-medium mb-2">Customer Confirmation</h4>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Confirmed:
                        </span>
                        <span
                          className={`ml-2 ${
                            refundItem.customerConfirmedDelivery.confirmed
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {refundItem.customerConfirmedDelivery.confirmed
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Auto-Confirmed:
                        </span>
                        <span
                          className={`ml-2 ${
                            refundItem.customerConfirmedDelivery.autoConfirmed
                              ? "text-blue-600"
                              : "text-gray-600"
                          }`}
                        >
                          {refundItem.customerConfirmedDelivery.autoConfirmed
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                      {refundItem.customerConfirmedDelivery.confirmedAt && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Confirmed At:
                          </span>
                          <span className="ml-2">
                            {format(
                              new Date(
                                refundItem.customerConfirmedDelivery.confirmedAt
                              ),
                              "MMM dd, yyyy 'at' h:mm a"
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {refundItem.returnWindow && (
                <div>
                  <h4 className="font-medium mb-2">Return Window</h4>
                  <p className="text-sm">
                    Until{" "}
                    {format(
                      new Date(refundItem.returnWindow),
                      "MMM dd, yyyy 'at' h:mm a"
                    )}
                  </p>
                </div>
              )}
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
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {refundItem.customer.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{refundItem.customer.email}</span>
                </div>
                {refundItem.customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{refundItem.customer.phone}</span>
                  </div>
                )}
                {refundItem.customer.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">
                      {refundItem.customer.address}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{refundItem.store.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{refundItem.store.email}</span>
                </div>
                {refundItem.store.description && (
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {refundItem.store.description}
                    </p>
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
                  {refundItem.shippingAddress?.address || "unknown"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Postal Code:{" "}
                  {refundItem.shippingAddress?.postalCode || "unknown"}
                </p>
              </div>
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
              <div className="space-y-3">
                {refundItem.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Payment Method:
                    </span>
                    <span className="font-medium">
                      {refundItem.paymentMethod}
                    </span>
                  </div>
                )}
                {refundItem.paymentStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Payment Status:
                    </span>
                    <Badge
                      variant={
                        refundItem.paymentStatus === "paid"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {refundItem.paymentStatus.charAt(0).toUpperCase() +
                        refundItem.paymentStatus.slice(1)}
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Sub-Order Amount:
                  </span>
                  <span>{formatNaira(refundItem.subOrderAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Total:</span>
                  <span>{formatNaira(refundItem.orderTotalAmount)}</span>
                </div>
                {refundItem.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{formatNaira(refundItem.discount)}</span>
                  </div>
                )}
                {refundItem.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>{formatNaira(refundItem.taxAmount)}</span>
                  </div>
                )}
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
                        new Date(refundItem.createdAt),
                        "MMM dd, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">{refundItem.deliveryStatus}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(refundItem.refundRequestDate),
                        "MMM dd, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Awaiting Refund Approval</p>
                    <p className="text-sm text-muted-foreground">
                      Current status
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {refundItem.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{refundItem.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
