"use client";

import { CreditCard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/utils/naira";
import type { ISubOrderFinancialsFormatted } from "@/domain/orders/interfaces/order.interface";

interface FinancialsCardProps {
  financials?: ISubOrderFinancialsFormatted;
  shippingPrice?: number;
  paymentStatus?: string;
  /** Undefined until the financial statuses query resolves. */
  financialStatus?: SuborderFinancialStatus;
  /** Drives the escrow copy: proof earns an immediate release. */
  hasDeliveryProof: boolean;
}

/**
 * Where this sub-order's money is.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE ESCROW LINE MATTERS MORE THAN THE NUMBERS
 * ─────────────────────────────────────────────────────────────────────────────
 * Proof of delivery is sold to vendors as a *faster payout* — collect the
 * customer's code and the money moves immediately instead of waiting three
 * days. A promise like that is only believed if the vendor can watch it happen,
 * so this card states plainly which of those two situations they are in and
 * why.
 *
 * The settlement figure is deliberately the largest thing here. It is the
 * number a vendor actually cares about, and burying it under gross totals is
 * how fee disputes start.
 */
export function FinancialsCard({
  financials,
  shippingPrice,
  paymentStatus,
  financialStatus,
  hasDeliveryProof,
}: FinancialsCardProps) {
  const isPaid = paymentStatus?.toLowerCase() === "paid";

  return (
    <Card>
      <CardHeader className="px-4 pb-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4 text-muted-foreground" aria-hidden />
            Financials
          </CardTitle>
          <Badge
            className={cn(
              "text-[10px]",
              isPaid
                ? "bg-soraxi-green text-white"
                : "bg-soraxi-error text-white",
            )}
          >
            {isPaid ? "Paid" : (paymentStatus ?? "Unpaid")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 sm:px-6">
        {financials ? (
          <>
            <div className="space-y-2 text-sm">
              <Line
                label="Items subtotal"
                value={financials.formattedSubtotal}
              />

              <Line
                label="Shipping"
                value={formatNaira(shippingPrice ?? 0)}
              />

              {financials.discount && (
                <Line
                  label="Discount"
                  value={`−${financials.discount.formattedAmount}`}
                  muted
                />
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <Line
                label="Customer paid"
                value={financials.formattedAmountPaid}
                bold
              />

              {/* Shown as a deduction, with the rate spelled out. A vendor who
                  cannot see how the fee was derived assumes the worst. */}
              <Line
                label={`Platform fee (${financials.platformFee.percentage}%)`}
                value={`−${financials.platformFee.formattedAmount}`}
                muted
              />
            </div>

            <Separator />

            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">Your settlement</span>
              <span className="text-lg font-bold text-soraxi-green">
                {financials.formattedVendorSettlementAmount}
              </span>
            </div>

            <EscrowNotice
              status={financialStatus}
              hasDeliveryProof={hasDeliveryProof}
            />
          </>
        ) : (
          <div className="flex justify-between text-sm font-medium">
            <span>Total</span>
            <span>{formatNaira(0)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Line({
  label,
  value,
  bold = false,
  muted = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className={cn(muted ? "text-muted-foreground" : "", bold && "font-semibold")}>
        {label}
      </span>
      <span
        className={cn(
          "text-right",
          muted && "text-muted-foreground",
          bold && "font-semibold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Where the money sits right now, and what moves it.
 *
 * Each state answers the vendor's actual question — "when do I get paid?" —
 * rather than restating the status name.
 */
function EscrowNotice({
  status,
  hasDeliveryProof,
}: {
  status?: SuborderFinancialStatus;
  hasDeliveryProof: boolean;
}) {
  if (status === SuborderFinancialStatus.SETTLED) {
    return (
      <Notice tone="success" title="Released">
        {hasDeliveryProof
          ? "The delivery code was confirmed, so your payment was released immediately."
          : "This payment has been released to your available balance."}
      </Notice>
    );
  }

  if (status === SuborderFinancialStatus.DISPUTED) {
    return (
      <Notice tone="danger" title="Frozen — dispute open">
        These funds are held while we review the dispute. You&apos;ll be
        notified once it&apos;s resolved.
      </Notice>
    );
  }

  if (status === SuborderFinancialStatus.REFUNDED) {
    return (
      <Notice tone="danger" title="Refunded">
        This sub-order was refunded to the customer.
      </Notice>
    );
  }

  return (
    <Notice tone="pending" title="In escrow">
      Releases as soon as the delivery code is entered — or after the customer
      confirms, or automatically in 3 days.
    </Notice>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: "pending" | "success" | "danger";
  title: string;
  children: React.ReactNode;
}) {
  const toneClass = {
    pending: "bg-muted/60 text-muted-foreground",
    success: "bg-soraxi-green/10 text-muted-foreground",
    danger: "bg-soraxi-error/10 text-muted-foreground",
  }[tone];

  const dotClass = {
    pending: "bg-soraxi-warning",
    success: "bg-soraxi-green",
    danger: "bg-soraxi-error",
  }[tone];

  return (
    <div className={cn("rounded-lg p-3", toneClass)}>
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span
          className={cn("size-2 shrink-0 rounded-full", dotClass)}
          aria-hidden
        />
        {title}
      </p>
      <p className="mt-1 text-xs">{children}</p>
    </div>
  );
}
