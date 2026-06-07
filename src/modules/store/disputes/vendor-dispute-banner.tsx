"use client";

import { ExternalLink, LockKeyhole, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils/naira";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import Link from "next/link";

interface VendorDisputeBannerProps {
  storeId: string;
  suborderId: string;
  status: SuborderFinancialStatus;
  disputeId: string | null;
  frozenAmount: number | null; // In Kobo
}

/**
 * VendorDisputeBanner
 *
 * Inline alert shown on a suborder section in the vendor order detail page
 * when that suborder has an active dispute or has been refunded.
 *
 * Read-only — the vendor cannot take any action here.
 * Provides a link to the full dispute detail page for more information.
 */
export function VendorDisputeBanner({
  storeId,
  status,
  disputeId,
  frozenAmount,
}: VendorDisputeBannerProps) {
  // DISPUTED — active dispute, funds frozen
  if (status === SuborderFinancialStatus.DISPUTED && disputeId) {
    return (
      <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/50">
            <LockKeyhole className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Funds Frozen — Dispute Open
            </p>
            {frozenAmount !== null && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {formatNaira(frozenAmount)} is currently held pending
                resolution. You will be notified of the outcome.
              </p>
            )}
          </div>
        </div>
        <Link href={`/store/${storeId}/disputes/${disputeId}`}>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-amber-400/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 mt-1"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            View Dispute Details
          </Button>
        </Link>
      </div>
    );
  }

  // REFUNDED — dispute was upheld, student was refunded
  if (status === SuborderFinancialStatus.REFUNDED) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 p-1.5 rounded-full bg-destructive/10">
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">
              Dispute Resolved — Refunded to Customer
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This dispute was resolved in the customer's favour. The funds for
              this suborder have been returned to them.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Nothing to show for other statuses
  return null;
}
