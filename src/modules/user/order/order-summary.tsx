import type React from "react";
/**
 * Order Summary Component
 *
 * Displays comprehensive order information including:
 * - Order overview (date, total amount)
 * - Payment information (method, status)
 * - Delivery information (address, postal code, stores count)
 */

import {
  Clock,
  CreditCard,
  CheckCircle2,
  Truck,
  MapPin,
  Store,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils/naira";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferProcedureOutput } from "@trpc/server";
import { DeliveryType } from "@/enums";
import { campusLocations } from "@/modules/checkout/order-summary";

type Output = inferProcedureOutput<AppRouter["order"]["getByOrderId"]>;

interface OrderSummaryProps {
  orderDetails: Output;
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
      <span className="hidden sm:inline-flex">{icon}</span>
      <span>{label}</span>
    </span>
    <span className={`text-sm font-medium ${valueClassName || ""}`}>
      {value || "N/A"}
    </span>
  </div>
);

export function OrderSummary({ orderDetails }: OrderSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Order Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailItem
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            label="Order Date"
            value={new Date(orderDetails.createdAt).toLocaleString()}
          />
          <DetailItem
            icon={null}
            label="Total Amount"
            value={formatNaira(orderDetails.totalAmount)}
          />
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailItem
            icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
            label="Payment Method"
            value={
              orderDetails.paymentMethod?.toUpperCase().replace("_", " ") ||
              "N/A"
            }
          />
          <DetailItem
            icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
            label="Payment Status"
            value={orderDetails.paymentStatus?.toUpperCase() || "N/A"}
          />
        </CardContent>
      </Card>

      <Card className="bg-muted/50 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Delivery Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailItem
            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            label="Shipping Address"
            value={
              orderDetails.shippingAddress?.deliveryType === DeliveryType.Campus
                ? `Campus Delivery (${campusLocations
                    .slice(0, 2)
                    .join(", ")}...)`
                : orderDetails.shippingAddress?.address ?? "No address provided"
            }
          />
          {/* Postal code is hidden since delivery is only within UNICAL */}
          {/* <DetailItem
            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
            label="Postal Code"
            value={
              orderDetails.shippingAddress?.postalCode ??
              "No postal code provided"
            }
          /> */}
          <DetailItem
            icon={<Store className="h-4 w-4 text-muted-foreground" />}
            label="Stores"
            value={orderDetails.stores.length.toString()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
