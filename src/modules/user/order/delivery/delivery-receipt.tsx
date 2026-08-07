"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";

import { DeliveryProofMethodEnum } from "@/enums";
import { cn } from "@/lib/utils";
import type { CustomerDeliveryProofView } from "@/domain/orders/delivery-proof-projection";

/** Plain-language description of how a delivery was established. */
function methodLabel(method?: DeliveryProofMethodEnum): string {
  switch (method) {
    case DeliveryProofMethodEnum.CustomerInApp:
      return "Confirmed in your account";
    case DeliveryProofMethodEnum.CodeByRider:
    case DeliveryProofMethodEnum.CodeByVendor:
      return "Code entered by recipient";
    case DeliveryProofMethodEnum.VendorDeclared:
      return "Marked delivered by vendor";
    default:
      return "Unknown";
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-words">{value}</span>
    </div>
  );
}

/**
 * The record of how a completed delivery was proven.
 *
 * Two visually distinct variants, because they mean very different things to
 * the customer:
 *
 * - **Proven** (green): someone released the code, or the customer confirmed in
 *   their own account. Nothing to do.
 * - **Unproven** (amber): the vendor asserted delivery and nothing corroborates
 *   it. This is the customer's cue to speak up if nothing arrived — so it must
 *   not look like a receipt, because it isn't one.
 */
export function DeliveryReceipt({
  proof,
  storeName,
}: {
  proof: CustomerDeliveryProofView;
  storeName: string;
}) {
  const isUnproven = proof.isUnproven;

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border p-3",
        isUnproven
          ? "border-soraxi-warning/60 bg-soraxi-warning/10"
          : "border-soraxi-green/40 bg-soraxi-green/5",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5 text-sm font-semibold",
          isUnproven ? "text-yellow-700 dark:text-soraxi-warning" : "text-soraxi-green",
        )}
      >
        {isUnproven ? (
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
        ) : (
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        )}
        {isUnproven ? "Marked delivered by vendor" : "Delivery confirmed"}
      </p>

      <div className="space-y-1.5 pt-1">
        <Row label="Store" value={storeName} />
        {proof.confirmedAt && (
          <Row
            label="Delivered"
            value={new Date(proof.confirmedAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        )}
        {proof.riderName && <Row label="Received by" value={proof.riderName} />}
        <Row label="Method" value={methodLabel(proof.method)} />
      </div>
    </div>
  );
}
