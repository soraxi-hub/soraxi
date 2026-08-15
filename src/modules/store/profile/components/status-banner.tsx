"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { StoreStatusTone } from "../store-status";

/**
 * Shown above everything when the store is not trading.
 *
 * Both variants answer the same two questions a vendor has on opening the page:
 * *can students buy from me right now*, and *what happens to orders I already
 * have*. The second matters more than it looks — a vendor who thinks a
 * suspension cancels their obligations stops delivering, and the customer's
 * money is still in escrow.
 */
export function StatusBanner({ tone }: { tone: StoreStatusTone }) {
  if (tone === "live") return null;

  const isSuspended = tone === "suspended";

  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border p-4",
        isSuspended
          ? "border-soraxi-error/50 bg-soraxi-error/5"
          : "border-soraxi-warning/60 bg-soraxi-warning/10",
      )}
    >
      <p
        className={cn(
          "text-sm font-semibold",
          isSuspended
            ? "text-soraxi-error"
            : "text-yellow-700 dark:text-soraxi-warning",
        )}
      >
        {isSuspended
          ? "Your store is suspended"
          : "Your store isn't live yet"}
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        {isSuspended
          ? "Students can't see your products while we review the account. Orders already placed still need to be fulfilled."
          : "We're still checking your details. Your products go live once your store is approved."}
      </p>

      {isSuspended && (
        <Button variant="outline" size="sm" asChild className="mt-3 w-full">
          <Link href="/support">Contact support</Link>
        </Button>
      )}
    </div>
  );
}
