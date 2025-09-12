"use client";

import type React from "react";
import {
  CheckCircle2Icon,
  Clock,
  DollarSign,
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
import { getStatusBadge } from "@/lib/utils";
import { ProductItem } from "./product-item";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferProcedureOutput } from "@trpc/server";
import { OrderTimeline } from "./order-timeline";

type ProductsOutput = inferProcedureOutput<AppRouter["order"]["getByOrderId"]>;

interface StoreAccordionProps {
  subOrders: ProductsOutput["subOrders"];
  totalProducts: number;
  storesCount: number;
  onUpdateDeliveryStatusAction: (subOrderId: string) => void;
  onReviewInitAction: (productId: string) => void;
  onReturnInitAction: (
    product: { _id: string; name: string; quantity: number; images?: string[] },
    subOrderId: string
  ) => void;
  submitting: boolean;
}

/**
 * Enhanced DetailItem component with icon
 */
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
  onUpdateDeliveryStatusAction,
  onReviewInitAction,
  onReturnInitAction,
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
              return (
                <AccordionItem
                  key={index}
                  value={`store-${index}`}
                  className="border rounded-lg"
                >
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <Store className="w-5 h-5 text-primary" />
                        <span className="font-medium">
                          {typeof subOrder.store === "object" &&
                          "name" in subOrder.store
                            ? subOrder.store.name
                            : `Store ${index + 1}`}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div
                          className={`p-2 rounded-full ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <Badge className={statusConfig.color}>
                          {subOrder.deliveryStatus}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pt-4">
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
                                  subOrder.deliveryDate
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
                      </div>

                      <div className="space-y-2">
                        <DetailItem
                          icon={
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          }
                          label="Shipping Cost"
                          value={formatNaira(
                            subOrder.shippingMethod?.price || 0
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

                        {!subOrder.customerConfirmedDelivery.confirmed &&
                          !subOrder.customerConfirmedDelivery.autoConfirmed &&
                          (subOrder.deliveryStatus === "Delivered" ||
                            subOrder.deliveryStatus === "Out for Delivery") && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() =>
                                    onUpdateDeliveryStatusAction(
                                      subOrder._id || ""
                                    )
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
                                You can also confirm when it's marked as{" "}
                                <strong>Out for Delivery</strong>.
                              </TooltipContent>
                            </Tooltip>
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
                                    subOrder.customerConfirmedDelivery.confirmedAt
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

                    {/* Products Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subOrder.products.map(
                        (product: any, productIndex: number) => (
                          <ProductItem
                            key={`${productIndex}`}
                            product={product}
                            onReviewInitAction={(id) => onReviewInitAction(id)}
                            onReturnInitAction={(product) =>
                              onReturnInitAction(product, subOrder._id)
                            }
                            deliveryStatus={subOrder.deliveryStatus}
                            subOrderId={subOrder._id}
                            returnWindow={subOrder.returnWindow}
                          />
                        )
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
