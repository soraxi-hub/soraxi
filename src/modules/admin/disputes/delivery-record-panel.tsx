"use client";

import { CheckCircle2, Info, ShieldCheck, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveryProofMethodEnum } from "@/enums";
import { cn } from "@/lib/utils";
import type { AdminDeliveryProofView } from "@/domain/orders/delivery-proof-projection";

interface DeliveryRecordPanelProps {
  proof: AdminDeliveryProofView | null;
  orderNumber: string;
}

/**
 * What happened at handover, for a moderator resolving a dispute.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS PANEL IS FRAMED AS A RECORD, NOT AS "PROOF"
 * ─────────────────────────────────────────────────────────────────────────────
 * Disputes are not all about non-delivery. A customer may have received the
 * wrong item, a damaged one, or something that doesn't match its description.
 * The platform has no dispute categories — `reason` is free text — so this
 * panel **cannot know** which kind of case it is sitting inside.
 *
 * That makes an over-confident presentation genuinely dangerous. A panel
 * shouting "STRONG PROOF — burden sits with the customer" on a damaged-goods
 * case invites a moderator to rule for the vendor on evidence that has nothing
 * to do with the complaint. A delivery code proves a parcel changed hands; it
 * says nothing whatsoever about what was inside it or what condition it was in.
 *
 * So the panel states facts, names precisely what they establish, and carries a
 * permanent scope note. The judgement stays with the human.
 */

type RecordTone = "confirmed" | "unconfirmed";

interface RecordCopy {
  title: string;
  /** What this record actually establishes — never who should win. */
  establishes: string;
  badge: string;
  tone: RecordTone;
  icon: typeof CheckCircle2;
}

function describe(proof: AdminDeliveryProofView | null): RecordCopy {
  if (!proof?.isConfirmed) {
    return {
      title: "No handover record",
      establishes:
        "Nothing records this parcel reaching the customer. Delivery rests on the vendor's word alone.",
      badge: "No record",
      tone: "unconfirmed",
      icon: TriangleAlert,
    };
  }

  switch (proof.method) {
    case DeliveryProofMethodEnum.CustomerInApp:
      return {
        title: "Customer confirmed receipt",
        establishes:
          "The customer confirmed receipt from their own account. This establishes that the parcel arrived — not what was inside it or its condition.",
        badge: "First-party",
        tone: "confirmed",
        icon: ShieldCheck,
      };

    case DeliveryProofMethodEnum.CodeByRider:
    case DeliveryProofMethodEnum.CodeByVendor:
      return {
        title: "Handover confirmed with the customer's code",
        establishes:
          "Someone holding the customer's delivery code took receipt, so the parcel reached them. This says nothing about its contents or condition.",
        badge: "Recipient-attested",
        tone: "confirmed",
        icon: CheckCircle2,
      };

    default:
      return {
        title: "Marked delivered by the vendor",
        establishes:
          "The vendor marked this delivered. No code was entered and the customer did not confirm, so nothing corroborates that the parcel arrived.",
        badge: "Vendor's word only",
        tone: "unconfirmed",
        icon: TriangleAlert,
      };
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-words">{value}</span>
    </div>
  );
}

export function DeliveryRecordPanel({
  proof,
  orderNumber,
}: DeliveryRecordPanelProps) {
  const copy = describe(proof);
  const Icon = copy.icon;
  const isConfirmed = copy.tone === "confirmed";

  const methodDetail =
    proof?.method === DeliveryProofMethodEnum.CodeByVendor
      ? "Code read to the vendor and entered by them"
      : proof?.method === DeliveryProofMethodEnum.CodeByRider
        ? "Code entered by the person delivering"
        : proof?.method === DeliveryProofMethodEnum.CustomerInApp
          ? "Confirmed in the customer's account"
          : "Marked delivered by the vendor";

  return (
    <Card
      className={cn(
        isConfirmed
          ? "border-soraxi-green/40"
          : "border-soraxi-warning/60 bg-soraxi-warning/5",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            <Icon
              className={cn(
                "h-4 w-4",
                isConfirmed
                  ? "text-soraxi-green"
                  : "text-yellow-700 dark:text-soraxi-warning",
              )}
              aria-hidden
            />
            Delivery record
          </CardTitle>

          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              isConfirmed
                ? "border-soraxi-green/40 text-soraxi-green"
                : "border-soraxi-warning/60 text-yellow-700 dark:text-soraxi-warning",
            )}
          >
            {copy.badge}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="font-medium">{copy.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.establishes}
          </p>
        </div>

        <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
          <Row label="Sub-order" value={orderNumber} />
          {proof?.confirmedAt && (
            <Row
              label="Recorded"
              value={new Date(proof.confirmedAt).toLocaleString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          )}
          {proof?.riderName && (
            <Row
              label="Delivered by"
              value={`${proof.riderName} (self-reported, unverified)`}
            />
          )}
          <Row label="Method" value={methodDetail} />
        </div>

        {/*
          The permanent scope note. Without it, a moderator reading a
          damaged-goods or wrong-item case could take a green panel as grounds
          to rule for the vendor — on a record that answers a different
          question entirely.
        */}
        <p className="flex gap-2 rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            This record answers <strong>whether the parcel arrived</strong>. It
            does not show what was inside it, whether it matched the listing, or
            what condition it was in. Weigh it only against claims about
            non-delivery — for anything else, read the customer&apos;s account
            and the evidence below.
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
