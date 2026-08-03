import { AlertCircle, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StoreViewState } from "../store-view-state";

interface StoreStatusBannerProps {
  state: StoreViewState;
}

/**
 * Copy for the states where the catalogue is withheld.
 *
 * Written for a shopper, not an operator: it says what they can and cannot do
 * here, and — for a suspension — reassures them about orders they have already
 * placed, which is the first thing someone landing on this page will worry
 * about. It never explains *why* a store was actioned.
 */
const BANNER_COPY = {
  pending: {
    icon: Clock,
    title: "This store is pending approval",
    body: "We're still checking this vendor's details. Their catalog goes live once they're verified.",
    className:
      "border-soraxi-warning/60 bg-soraxi-warning/10 text-foreground [&_svg]:text-yellow-600 dark:[&_svg]:text-soraxi-warning",
  },
  suspended: {
    icon: AlertCircle,
    title: "This store is suspended",
    body: "Its products are hidden while we review the account. Orders you already placed are unaffected.",
    className:
      "border-soraxi-error/60 bg-soraxi-error/10 text-foreground [&_svg]:text-soraxi-error",
  },
} as const;

/**
 * Banner shown above the storefront when a store is not trading.
 *
 * Renders nothing for `active` and `empty` — an empty catalogue is a normal
 * state that needs no warning, only the empty product panel.
 */
export function StoreStatusBanner({ state }: StoreStatusBannerProps) {
  if (state === "active" || state === "empty") return null;

  const { icon: Icon, title, body, className } = BANNER_COPY[state];

  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-lg border p-4 sm:p-5",
        className,
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold sm:text-base">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
