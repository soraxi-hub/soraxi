"use client";

import type React from "react";
import {
  CheckCircle2Icon,
  Clock,
  DollarSign,
  ExternalLink,
  Loader,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { formatNaira } from "@/lib/utils/naira";
import { getStatusBadge, truncateText } from "@/lib/utils";
import { ProductItem } from "./product-item";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferProcedureOutput } from "@trpc/server";
import { OrderTimeline } from "./order-timeline";
import { DeliveryStatus, deliveryStatusLabel } from "@/enums";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import Link from "next/link";

type ProductsOutput = inferProcedureOutput<AppRouter["order"]["getByOrderId"]>;

/**
 * Financial status map returned by getSuborderFinancialStatuses
 * keyed by suborderId
 */
type FinancialStatusMap = Record<
  string,
  {
    status: SuborderFinancialStatus;
    disputeId: string | null;
  }
>;

interface StoreAccordionProps {
  subOrders: ProductsOutput["subOrders"];
  totalProducts: number;
  storesCount: number;
  orderId: string; // Needed for dispute status page link
  financialStatuses: FinancialStatusMap; // From getSuborderFinancialStatuses
  onUpdateDeliveryStatusAction: (subOrderId: string) => void;
  onReviewInitAction: (productId: string) => void;
  onDisputeInitAction: (subOrderId: string, storeName: string) => void;
  submitting: boolean;
}

const DetailItem = ({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
}) => (
  <div className="flex justify-between items-center py-2 border-b">
    <span className="text-sm text-muted-foreground flex items-center gap-2">
      {icon}
      {label}
    </span>
    <span className={`text-sm font-medium ${valueClassName || ""}`}>
      {value || "N/A"}
    </span>
  </div>
);

export function StoreAccordion({
  subOrders,
  totalProducts,
  storesCount,
  orderId,
  financialStatuses,
  onUpdateDeliveryStatusAction,
  onReviewInitAction,
  onDisputeInitAction,
  submitting,
}: StoreAccordionProps) {
  return (
    <Card className="bg-muted/50 rounded-lg shadow-xs mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          {totalProducts} Item{totalProducts > 1 && "s"} from {storesCount}{" "}
          Store
          {storesCount > 1 && "s"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Accordion type="single" collapsible className="w-full space-y-4">
            {subOrders.map((subOrder, index) => {
              const statusConfig = getStatusBadge(subOrder.deliveryStatus);
              const StatusIcon = statusConfig.icon;

              const subOrderId = subOrder._id ?? "";
              const financialStatus = financialStatuses[subOrderId];
              const storeName =
                typeof subOrder.store === "object" && "name" in subOrder.store
                  ? subOrder.store.name
                  : `Store ${index + 1}`;

              // Determine dispute UI state for this suborder
              const isDisputeOpen =
                financialStatus?.status === SuborderFinancialStatus.DISPUTED;
              const isRefunded =
                financialStatus?.status === SuborderFinancialStatus.REFUNDED;

              // Show dispute button only when:
              // - Order is in a deliverable state (delivered)
              // - Financial status is PENDING (not yet settled, disputed, or refunded)
              // - Delivery has not been confirmed yet
              const canRaiseDispute =
                financialStatus?.status !== SuborderFinancialStatus.REFUNDED &&
                financialStatus?.status !== SuborderFinancialStatus.DISPUTED &&
                financialStatus?.status !== SuborderFinancialStatus.HELD &&
                subOrder.deliveryStatus === DeliveryStatus.Delivered;

              return (
                <AccordionItem
                  key={index}
                  value={`store-${index}`}
                  className="sm:border rounded-lg"
                >
                  <AccordionTrigger className="sm:px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <Store className="w-5 h-5 text-primary hidden sm:inline-flex" />
                        <span className="font-medium">
                          {truncateText(storeName, 15)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {/* Dispute status badges */}
                        {isDisputeOpen && (
                          <Badge
                            variant="outline"
                            className="border-amber-400 text-amber-600 dark:text-amber-400 text-xs"
                          >
                            Dispute Open
                          </Badge>
                        )}
                        {isRefunded && (
                          <Badge
                            variant="outline"
                            className="border-soraxi-green text-soraxi-green text-xs"
                          >
                            Refunded
                          </Badge>
                        )}
                        <div
                          className={`p-2 rounded-full ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <Badge className={statusConfig.color}>
                          {deliveryStatusLabel(subOrder.deliveryStatus)}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="sm:px-4 sm:pt-4">
                    <div className="grid md:grid-cols-2 gap-6 mb-2">
                      <div className="space-y-2">
                        <DetailItem
                          icon={
                            <Truck className="h-4 w-4 text-muted-foreground" />
                          }
                          label="Shipping Method"
                          value={subOrder.shippingMethod?.name || "N/A"}
                        />
                        <DetailItem
                          icon={
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          }
                          label="Delivery Date"
                          value={
                            subOrder.deliveryDate
                              ? new Date(
                                  subOrder.deliveryDate,
                                ).toLocaleDateString()
                              : "N/A"
                          }
                        />
                        {subOrder.customerConfirmedDelivery.confirmed && (
                          <DetailItem
                            icon={
                              <CheckCircle2Icon className="h-4 w-4 text-soraxi-green" />
                            }
                            label=""
                            value={"Delivery Confirmed"}
                          />
                        )}

                        {/* Raise Dispute button */}
                        {canRaiseDispute && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  onDisputeInitAction(subOrderId, storeName)
                                }
                                disabled={submitting}
                                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                Raise a Dispute
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-sm leading-snug">
                              Received the wrong item or something damaged?{" "}
                              <br />
                              Raise a dispute and we&#39;ll investigate.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <div className="space-y-2">
                        <DetailItem
                          icon={
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          }
                          label="Shipping Cost"
                          value={formatNaira(
                            subOrder.shippingMethod?.price || 0,
                          )}
                        />
                        <DetailItem
                          icon={
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          }
                          label="Estimated Delivery"
                          value={
                            subOrder.shippingMethod?.estimatedDeliveryDays ||
                            "N/A"
                          }
                        />

                        {/* Confirm Delivery button */}
                        {!subOrder.customerConfirmedDelivery.confirmed &&
                          !subOrder.customerConfirmedDelivery.autoConfirmed &&
                          (subOrder.deliveryStatus ===
                            DeliveryStatus.Delivered ||
                            subOrder.deliveryStatus ===
                              DeliveryStatus.OutForDelivery) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() =>
                                    onUpdateDeliveryStatusAction(subOrderId)
                                  }
                                  disabled={submitting}
                                  className="w-full mt-2 text-white bg-soraxi-green hover:bg-soraxi-green-hover"
                                >
                                  {submitting ? (
                                    <Loader className="animate-spin mr-2" />
                                  ) : (
                                    "Confirm Delivery"
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-sm leading-snug">
                                If your order has arrived, please confirm it.{" "}
                                <br />
                                This helps us release payment to the seller.{" "}
                                <br />
                                You can also confirm when it&#39;s marked as{" "}
                                <strong>Out for Delivery</strong>.
                              </TooltipContent>
                            </Tooltip>
                          )}

                        {/* Dispute open — link to status page */}
                        {isDisputeOpen && financialStatus?.disputeId && (
                          <Link
                            href={`/orders/${orderId}/dispute/${financialStatus.disputeId}`}
                          >
                            <Button
                              variant="outline"
                              className="w-full mt-2 border-amber-400/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Dispute
                            </Button>
                          </Link>
                        )}

                        {subOrder.customerConfirmedDelivery.confirmed && (
                          <DetailItem
                            icon={
                              <CheckCircle2Icon className="h-4 w-4 text-soraxi-green" />
                            }
                            label="Delivery Confirmed On"
                            value={
                              subOrder.customerConfirmedDelivery.confirmedAt
                                ? new Date(
                                    subOrder.customerConfirmedDelivery.confirmedAt,
                                  ).toLocaleDateString()
                                : "N/A"
                            }
                          />
                        )}

                        {subOrder.customerConfirmedDelivery.autoConfirmed && (
                          <DetailItem
                            icon={
                              <CheckCircle2Icon className="h-4 w-4 text-soraxi-green" />
                            }
                            label=""
                            value={"Auto Confirmed"}
                          />
                        )}

                        <OrderTimeline subOrder={subOrder} />
                      </div>
                    </div>

                    <Separator className="mb-6" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subOrder.products.map(
                        (product, productIndex: number) => (
                          <ProductItem
                            key={`${productIndex}`}
                            product={product}
                            onReviewInitAction={(id) => onReviewInitAction(id)}
                            // Returns functionality removed — replaced by disputes
                            onReturnInitAction={() => {}}
                            deliveryStatus={subOrder.deliveryStatus}
                            subOrderId={subOrderId}
                          />
                        ),
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
