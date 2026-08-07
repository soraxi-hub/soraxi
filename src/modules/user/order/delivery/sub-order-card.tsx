"use client";

import { useState } from "react";
import { ChevronDown, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { DeliveryStatus, deliveryStatusLabel } from "@/enums";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/utils/naira";
import { MessageAboutOrderButton } from "@/modules/messaging/components/message-about-order-button";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferProcedureOutput } from "@trpc/server";

import { DeliveryCodeBlock } from "./delivery-code-block";
import { DeliveryReceipt } from "./delivery-receipt";
import { ProductItem } from "../product-item";

type OrderOutput = inferProcedureOutput<AppRouter["order"]["getByOrderId"]>;
type SubOrder = OrderOutput["subOrders"][number];

interface SubOrderCardProps {
  subOrder: SubOrder;
  financialStatus?: {
    status: SuborderFinancialStatus;
    disputeId: string | null;
  };
  onConfirmReceipt: (subOrderId: string) => void;
  onReviewInit: (productId: string) => void;
  onDisputeInit: (subOrderId: string, storeName: string) => void;
  submitting: boolean;
}

/**
 * One store's portion of an order.
 *
 * Replaces the previous accordion, which treated a sub-order as a passive
 * record. Each one now carries a live, time-sensitive action — a code to hand
 * over, a receipt to confirm, a problem to report — so the card leads with what
 * the customer has to *do* and tucks the line items behind a toggle.
 *
 * Cards needing attention open expanded; settled ones start collapsed.
 */
export function SubOrderCard({
  subOrder,
  financialStatus,
  onConfirmReceipt,
  onReviewInit,
  onDisputeInit,
  submitting,
}: SubOrderCardProps) {
  const subOrderId = subOrder._id.toString();
  const proof = subOrder.deliveryProof;

  const isDelivered = subOrder.deliveryStatus === DeliveryStatus.Delivered;
  const awaitingCode = Boolean(proof?.code) && !isDelivered;
  const needsAttention = awaitingCode || proof?.isUnproven;

  const [expanded, setExpanded] = useState(Boolean(needsAttention));

  // The store's real name. This used to render as "Store 1" / "Store 2" — a
  // placeholder that shipped. It matters more now: a customer holding two codes
  // at once must know which rider gets which.
  const storeName = subOrder.storeSnapshot?.name ?? "Store";

  const isDisputed =
    financialStatus?.status === SuborderFinancialStatus.DISPUTED;
  const isRefunded =
    financialStatus?.status === SuborderFinancialStatus.REFUNDED;

  const canDispute =
    isDelivered &&
    !isDisputed &&
    !isRefunded &&
    financialStatus?.status !== SuborderFinancialStatus.HELD;

  const subtotal = subOrder.products.reduce(
    (sum, p) =>
      sum +
      (p.productSnapshot?.price ?? 0) * (p.productSnapshot?.quantity ?? 0),
    0,
  );

  return (
    <Card
      className={cn(
        "overflow-hidden mb-6",
        needsAttention && "border-soraxi-green/40",
      )}
    >
      <CardContent className="space-y-4 px-4 py-4 sm:px-6">
        {/* Header: who, what state, how much */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Store className="size-4 text-muted-foreground" aria-hidden />
            </span>

            <div className="min-w-0">
              <p className="truncate font-semibold">{storeName}</p>

              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    isDelivered && "border-soraxi-green/40 text-soraxi-green",
                  )}
                >
                  {deliveryStatusLabel(subOrder.deliveryStatus)}
                </Badge>

                {/* `text-black` in both themes: the warning token is a bright
                    yellow that white text disappears against. */}
                {awaitingCode && (
                  <Badge className="bg-soraxi-warning text-[10px] text-black">
                    Awaiting code
                  </Badge>
                )}

                {proof?.isUnproven && (
                  <Badge className="bg-soraxi-warning text-[10px] text-black">
                    No proof
                  </Badge>
                )}

                {isDisputed && (
                  <Badge
                    variant="outline"
                    className="border-soraxi-error/40 text-[10px] text-soraxi-error"
                  >
                    Dispute open
                  </Badge>
                )}

                {isRefunded && (
                  <Badge
                    variant="outline"
                    className="border-soraxi-green/40 text-[10px] text-soraxi-green"
                  >
                    Refunded
                  </Badge>
                )}

                <span className="text-xs text-muted-foreground">
                  {subOrder.products.length}{" "}
                  {subOrder.products.length === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
          </div>

          <p className="shrink-0 font-semibold">{formatNaira(subtotal)}</p>
        </div>

        {/* State-specific guidance and actions */}
        {awaitingCode && proof?.code && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {subOrder.deliveryStatus === DeliveryStatus.OutForDelivery
                ? "The rider is on the way. Give them this code when your items are in your hands."
                : "On its way. Give the delivery person this code when your items are in your hands."}
            </p>

            <DeliveryCodeBlock code={proof.code} />

            <Button
              onClick={() => onConfirmReceipt(subOrderId)}
              disabled={submitting}
              className="w-full gap-2 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
            >
              {submitting && <Spinner className="size-4" />}
              I&apos;ve received these items
            </Button>
          </div>
        )}

        {isDelivered && proof?.isUnproven && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The vendor marked this delivered. If you haven&apos;t received it,
              let us know.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => onConfirmReceipt(subOrderId)}
                disabled={submitting}
                className="flex-1 gap-2 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
              >
                {submitting && <Spinner className="size-4" />}
                Confirm I received this
              </Button>
              {canDispute && (
                <Button
                  variant="outline"
                  onClick={() => onDisputeInit(subOrderId, storeName)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Report a problem
                </Button>
              )}
            </div>

            <DeliveryReceipt proof={proof} storeName={storeName} />
          </div>
        )}

        {isDelivered && proof?.isConfirmed && !proof.isUnproven && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Delivered and confirmed. Nothing left to do.
            </p>
            <DeliveryReceipt proof={proof} storeName={storeName} />
          </div>
        )}

        {!isDelivered && !awaitingCode && (
          <p className="text-sm text-muted-foreground">
            Being packed. Your delivery code appears here once it&apos;s on the
            way.
          </p>
        )}

        {/* Line items */}
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="flex items-center gap-1 text-sm font-medium text-soraxi-green hover:underline"
        >
          {expanded ? "Hide details" : "See details"}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {expanded && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {subOrder.products.map((product, index) => (
                <ProductItem
                  key={product.productSnapshot?._id?.toString() ?? index}
                  product={product}
                  onReviewInitAction={onReviewInit}
                  onReturnInitAction={() => {}}
                  deliveryStatus={subOrder.deliveryStatus}
                  subOrderId={subOrderId}
                />
              ))}
            </div>

            <div className="flex justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">Sub-order total</span>
              <span className="font-semibold">{formatNaira(subtotal)}</span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <MessageAboutOrderButton
                subOrderId={subOrderId}
                role="customer"
                className="sm:w-auto"
              />
              {canDispute && (
                <Button
                  variant="outline"
                  onClick={() => onDisputeInit(subOrderId, storeName)}
                  disabled={submitting}
                  className="w-full border-soraxi-error/50 text-soraxi-error hover:bg-soraxi-error/10 hover:text-soraxi-error sm:w-auto"
                >
                  Raise a dispute
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
