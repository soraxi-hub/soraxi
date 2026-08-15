import type React from "react";
/**
 * Order Summary Component
 *
 * Displays comprehensive order information including:
 * - Order overview (date, total amount, discount)
 * - Payment information (method, status)
 * - Delivery information (address)
 *
 * Order date, store count and total live in the page header, not here.
 */

import { Truck, MapPin, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferProcedureOutput } from "@trpc/server";
import { DeliveryType } from "@/enums";

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
                ? `Campus Delivery`
                : (orderDetails.shippingAddress?.address ??
                  "No address provided")
            }
          />
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
