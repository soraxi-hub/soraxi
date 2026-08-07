"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Package, MapPin, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { toast } from "sonner";
import { formatNaira } from "@/lib/utils/naira";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { cn, getStatusBadge } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { campusLocations } from "@/modules/checkout/order-summary";
import {
  DeliveryStatus,
  deliveryStatusLabel,
  DeliveryType,
  statusHistoryLabel,
} from "@/enums";
import { siteConfig } from "@/config/site";

import { useQuery } from "@tanstack/react-query";
import { VendorDisputeBanner } from "@/modules/store/disputes/vendor-dispute-banner";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import { DeliveryLinkCard } from "./delivery/delivery-link-card";
import { DeliveryActions } from "./delivery/delivery-actions";
import { StatusStepper } from "./delivery/status-stepper";
import { CustomerInformationCard } from "./delivery/customer-information-card";
import { FinancialsCard } from "./delivery/financials-card";
import { MessageAboutOrderButton } from "@/modules/messaging/components/message-about-order-button";
import { formatOrderNumber } from "@/lib/utils/order-number";

/**
 * Order Detail View Component Props
 */
interface OrderDetailViewProps {
  orderId: string;
  storeId: string;
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
  const [showActionDialog, setShowActionDialog] = useState(false);
  // const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [subOrderId, setSubOrderId] = useState<string>("");
  const [newStatus, setNewStatus] = useState<DeliveryStatus | null>(null);

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
    data: order,
    isLoading: loading,
    refetch: refetchOrder,
    error,
  } = useSuspenseQuery(
    trpc.storeOrders.getStoreOrderById.queryOptions({ orderId }),
  );

  const { data: financialData } = useQuery(
    trpc.vendorDispute.getOrderFinancialStatuses.queryOptions({
      orderId,
    }),
  );

  const financialStatuses = financialData?.statuses ?? {};
  const statusConfig = getStatusBadge(order.subOrder.deliveryStatus);

  // Keyed off the sub-order actually being viewed. This previously read
  // `financialStatuses[subOrderId]`, where `subOrderId` is the *dialog* state
  // and starts empty — so the lookup returned undefined until a status dialog
  // had been opened, silently hiding the dispute banner.
  const financialStatus = financialStatuses[order.subOrder._id.toString()];

  // The vendor's projection carries the token, never the customer's code. The
  // link is built here rather than server-side so the origin always matches the
  // host the vendor is actually on.
  const deliveryToken = order.subOrder.deliveryProof?.token;
  const deliveryLink =
    deliveryToken && typeof window !== "undefined"
      ? `${window.location.origin}/d/${deliveryToken}`
      : deliveryToken
        ? `/d/${deliveryToken}`
        : null;

  // A live link with no confirmation yet — the vendor still has a code to
  // collect. Drives the header badge.
  const awaitingCode =
    Boolean(deliveryToken) && !order.subOrder.deliveryProof?.isConfirmed;
  // const { order } = data;

  const StatusUpdate = useMutation(
    trpc.orderStatus.updateStatus.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        setUpdating(false);
        refetchOrder();
        setShowActionDialog(false);
        setSubOrderId("");
        setNewStatus(null);
      },
      onError: (error) => {
        toast.error(error.message || `Failed to update order status`);
        setUpdating(false);
      },
    }),
  );

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
  const handleStatusUpdate = async (
    subOrderId: string,
    newStatus: DeliveryStatus,
  ) => {
    setSubOrderId(subOrderId);
    setNewStatus(newStatus);
    setShowActionDialog(true);
  };

  const confirmAction = () => {
    if (!newStatus) {
      toast.info("Please select a new status");
      return;
    }
    setUpdating(true);

    StatusUpdate.mutate({
      orderId,
      subOrderId,
      deliveryStatus: newStatus,
    });
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
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Order</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Order not found"}
          </p>
          <Button
            className="bg-soraxi-green text-white hover:bg-soraxi-green-hover"
            onClick={() => refetchOrder()}
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
      {/* Header. Leads with the human-readable sub-order reference rather than
          a raw ObjectId — this is the string a vendor reads out to a customer
          or searches support by. The summary line carries the four facts they
          need before scrolling: who, how many, how much, when. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">
            Sub-order{" "}
            <span className="font-mono">
              {formatOrderNumber(
                order.subOrder._id.toString(),
                order.createdAt,
              )}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customerInfo.name} · {order.totalItems}{" "}
            {order.totalItems === 1 ? "item" : "items"} ·{" "}
            {order.subOrder.financials?.formattedAmountPaid ??
              order.formattedTotalAmount}{" "}
            · placed {format(new Date(order.createdAt), "d MMMM yyyy")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Only while a code is actually outstanding — a badge that lingers
              after delivery would be telling the vendor to chase something
              that is already done. */}
          {awaitingCode && (
            <Badge className="bg-soraxi-warning text-xs text-black">
              Awaiting code
            </Badge>
          )}

          <MessageAboutOrderButton
            subOrderId={order.subOrder._id.toString()}
            role="vendor"
            storeId={order.storeId}
            label="Message customer"
            className="w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery link — sits above the status card because sharing it is
              the action we most want the vendor to take, and it disappears once
              delivery is confirmed. */}
          {order.subOrder.deliveryStatus !== DeliveryStatus.Delivered && (
            <DeliveryLinkCard
              orderId={order.orderId}
              subOrderId={order.subOrder._id.toString()}
              link={deliveryLink}
            />
          )}

          {/* Order Status and Actions */}
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Status
                </CardTitle>
                <Badge variant={statusConfig.variant}>
                  {deliveryStatusLabel(order.subOrder.deliveryStatus)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-4 sm:px-6">
              <StatusStepper status={order.subOrder.deliveryStatus} />

              {/* Dispute banner — shown when suborder is DISPUTED or REFUNDED */}
              {financialStatus &&
                (financialStatus.status === SuborderFinancialStatus.DISPUTED ||
                  financialStatus.status ===
                    SuborderFinancialStatus.REFUNDED) && (
                  <VendorDisputeBanner
                    storeId={order.storeId}
                    suborderId={order.subOrder._id.toString()}
                    status={financialStatus.status}
                    disputeId={financialStatus.disputeId}
                    frozenAmount={financialStatus.frozenAmount}
                  />
                )}

              <DeliveryActions
                orderId={order.orderId}
                subOrderId={order.subOrder._id.toString()}
                status={order.subOrder.deliveryStatus}
                updating={updating}
                onAdvance={handleStatusUpdate}
              />
            </CardContent>
          </Card>

          {/* Products in Order */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  {order.subOrder.products.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg"
                    >
                      {/* Product Image */}
                      <div className="relative w-24 h-24 sm:w-16 sm:h-16 mx-auto sm:mx-0 flex-shrink-0">
                        <Image
                          src={
                            item.productSnapshot.images[0] ||
                            siteConfig.placeHolderImg
                          }
                          alt={item.productSnapshot.name}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h4 className="font-medium truncate">
                          {item.productSnapshot.name}
                        </h4>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span>Qty: {item.productSnapshot.quantity}</span>
                          {item.productSnapshot.selectedSize && (
                            <span>
                              Size: {item.productSnapshot.selectedSize.size}
                            </span>
                          )}
                          <span>
                            Price: {formatNaira(item.productSnapshot.price)}
                          </span>
                        </div>
                      </div>

                      {/* Price Summary */}
                      <div className="text-center sm:text-right mt-2 sm:mt-0">
                        <p className="font-medium">
                          {formatNaira(
                            item.productSnapshot.price *
                              item.productSnapshot.quantity,
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
                  {order.shippingAddress?.deliveryType === DeliveryType.Campus
                    ? `Campus Delivery (${campusLocations.join(", ")})`
                    : order.shippingAddress.address}
                </p>
                {/* Postal code is hidden since delivery is only within UNICAL */}
                {/* <p className="text-sm text-muted-foreground">
                  Postal Code: {order.shippingAddress?.postalCode || "Unknown"}
                </p> */}
              </div>

              {order.subOrder.shippingMethod && (
                <div>
                  <h4 className="font-medium mb-2">Shipping Method</h4>
                  <div className="space-y-1 text-sm">
                    <p>{order.subOrder.shippingMethod.name}</p>
                    <p className="text-muted-foreground">
                      {formatNaira(order.subOrder.shippingMethod.price)}
                    </p>
                    {order.subOrder.shippingMethod.estimatedDeliveryDays && (
                      <p className="text-muted-foreground">
                        Est.{" "}
                        {order.subOrder.shippingMethod.estimatedDeliveryDays}{" "}
                        days
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Information */}
        <div className="space-y-6">
          <CustomerInformationCard
            name={order.customerInfo.name}
            email={order.customerInfo.email}
            phoneNumber={order.customerInfo.phoneNumber}
            subOrderId={order.subOrder._id.toString()}
            storeId={order.storeId}
          />

          <FinancialsCard
            financials={order.subOrder.financials}
            shippingPrice={order.subOrder.shippingMethod?.price}
            paymentStatus={order.paymentStatus}
            financialStatus={financialStatus?.status}
            hasDeliveryProof={Boolean(order.subOrder.deliveryProof?.isConfirmed)}
          />

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
                <ScrollArea className="h-48 pr-2">
                  <div className="flex flex-col gap-3">
                    {order.subOrder.statusHistory &&
                    order.subOrder.statusHistory.length > 0 ? (
                      order.subOrder.statusHistory.map(
                        (statusItem, statusIndex) => (
                          <div
                            key={statusIndex}
                            className="flex items-center gap-3"
                          >
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <div>
                              <p className="font-medium">
                                {statusHistoryLabel(statusItem.status)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(
                                  new Date(statusItem.timestamp),
                                  "MMM dd, yyyy 'at' h:mm a",
                                )}
                              </p>
                              {statusItem.notes && (
                                <p className="text-sm text-muted-foreground">
                                  Notes: {statusItem.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No status history available
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm{" "}
              {newStatus
                ? newStatus.charAt(0).toUpperCase() + newStatus.slice(1)
                : ""}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this product as &#34;
              {newStatus &&
                newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
              &#34;? This action can not be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(false)}
              disabled={StatusUpdate.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={StatusUpdate.isPending}
              className={cn(
                "bg-soraxi-green hover:bg-soraxi-green-hover text-white hover:text-white",
              )}
            >
              {StatusUpdate.isPending
                ? "Processing..."
                : `Mark Product as "${
                    newStatus &&
                    newStatus.charAt(0).toUpperCase() + newStatus.slice(1)
                  }"`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
