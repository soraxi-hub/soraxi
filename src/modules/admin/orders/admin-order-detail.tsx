"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  Package,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { formatNaira } from "@/lib/utils/naira";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import Image from "next/image";
import Link from "next/link";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";

// ---------------------------------------------------------------------------
// Financial status badge
// ---------------------------------------------------------------------------

function FinancialStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    [SuborderFinancialStatus.PENDING]: {
      label: "Pending Release",
      className:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    },
    [SuborderFinancialStatus.SETTLED]: {
      label: "Settled",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    },
    [SuborderFinancialStatus.DISPUTED]: {
      label: "Disputed",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    },
    [SuborderFinancialStatus.REFUNDED]: {
      label: "Refunded",
      className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    },
  };

  const cfg = config[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-800",
  };

  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function AdminOrderDetailContent({ orderId }: { orderId: string }) {
  const trpc = useTRPC();

  const { data: order } = useSuspenseQuery(
    trpc.adminOrders.getAdminOrderById.queryOptions({ orderId }),
  );

  const getPaymentBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {order.orderNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              Placed on{" "}
              {format(new Date(order.createdAt), "MMMM dd, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getPaymentBadge(order.paymentStatus)}
          {order.flutterwaveReference && (
            <span className="text-xs text-muted-foreground font-mono">
              FLW: {order.flutterwaveReference}
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-sm text-muted-foreground">
              {order.customer.email}
            </p>
            {order.customer.phone && (
              <p className="text-sm text-muted-foreground">
                {order.customer.phone}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-semibold">
                {formatNaira(order.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              {getPaymentBadge(order.paymentStatus)}
            </div>
          </CardContent>
        </Card>

        {/* Shipping */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Shipping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{order.shippingAddress?.address ?? "N/A"}</p>
            {order.shippingAddress?.postalCode && (
              <p className="text-sm text-muted-foreground">
                Postal: {order.shippingAddress.postalCode}
              </p>
            )}
            {order.shippingAddress?.campusName && (
              <p className="text-sm text-muted-foreground">
                Campus: {order.shippingAddress.campusName}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sub-orders */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Sub-orders ({order.subOrders.length})
        </h2>

        {order.subOrders.map((subOrder) => (
          <Card key={subOrder.subOrderId} className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base font-semibold">
                  {subOrder.storeName}
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {subOrder.financialStatus && (
                    <FinancialStatusBadge
                      status={subOrder.financialStatus.status}
                    />
                  )}
                  <Badge variant="outline" className="text-xs">
                    {subOrder.deliveryStatus}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Dispute alert — shown when suborder is DISPUTED */}
              {subOrder.financialStatus?.status ===
                SuborderFinancialStatus.DISPUTED &&
                subOrder.financialStatus.disputeId && (
                  <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <LockKeyhole className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        Active dispute — funds frozen
                      </p>
                    </div>
                    <Link
                      href={`/admin/disputes/${subOrder.financialStatus.disputeId}`}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-400/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Resolve Dispute
                      </Button>
                    </Link>
                  </div>
                )}

              {/* Refunded alert */}
              {subOrder.financialStatus?.status ===
                SuborderFinancialStatus.REFUNDED && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">
                    Dispute upheld — customer was refunded for this suborder
                  </p>
                </div>
              )}

              {/* Financial breakdown */}
              {subOrder.financialStatus && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">Gross</p>
                    <p className="text-sm font-semibold">
                      {formatNaira(subOrder.financialStatus.grossAmount)}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">Commission</p>
                    <p className="text-sm font-semibold text-soraxi-green">
                      {formatNaira(subOrder.financialStatus.commission)}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">Vendor Net</p>
                    <p className="text-sm font-semibold">
                      {formatNaira(subOrder.financialStatus.settleAmount)}
                    </p>
                  </div>
                </div>
              )}

              {/* Products */}
              <div className="space-y-2">
                {subOrder.products.map((product, pIndex) => (
                  <div
                    key={pIndex}
                    className="flex items-center gap-3 p-2 rounded-lg border border-border"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {product.quantity} × {formatNaira(product.price)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">
                      {formatNaira(product.price * product.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Delivery info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Shipping method
                  </Label>
                  <p>{subOrder.shippingMethod?.name ?? "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Delivery date
                  </Label>
                  <p>
                    {subOrder.deliveryDate
                      ? format(new Date(subOrder.deliveryDate), "MMM dd, yyyy")
                      : "Not delivered"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Customer confirmed
                  </Label>
                  <div className="flex items-center gap-1 mt-0.5">
                    {subOrder.customerConfirmedDelivery.confirmed ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-soraxi-green" />
                        <span className="text-xs text-soraxi-green">
                          {subOrder.customerConfirmedDelivery.autoConfirmed
                            ? "Auto-confirmed"
                            : "Confirmed"}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not yet confirmed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status history */}
              {subOrder.statusHistory.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Status history ({subOrder.statusHistory.length} events)
                  </summary>
                  <div className="mt-2 space-y-2 pl-4 border-l-2 border-border">
                    {subOrder.statusHistory.map((entry, i) => (
                      <div key={i}>
                        <p className="text-xs font-medium">{entry.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            new Date(entry.timestamp),
                            "MMM dd, yyyy 'at' h:mm a",
                          )}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Order Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AdminOrderDetail({ orderId }: { orderId: string }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <AdminOrderDetailContent orderId={orderId} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default withAdminAuth(AdminOrderDetail, {
  requiredPermissions: [PERMISSIONS.VIEW_ORDERS],
});
