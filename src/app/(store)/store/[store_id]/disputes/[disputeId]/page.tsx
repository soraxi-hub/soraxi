"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { Separator } from "@/components/ui/separator";
import { DisputeOutcome, DisputeStatus } from "@/enums/financial.enums";
import { DateFormatter } from "@/lib/utils/date-formatter";
import {
  CaseOverviewCard,
  FinancialImpactCard,
  DisputeTimeline,
  EvidenceGallery,
  ResolutionCard,
  WhatHappensNextSection,
  VendorSupportSection,
} from "@/components/disputes/vendor";

/**
 * Inner page content component
 * Data is fetched via Suspense
 */
function VendorDisputeDetailContent({
  disputeId,
}: {
  storeId: string;
  disputeId: string;
}) {
  const trpc = useTRPC();

  const { data: dispute } = useSuspenseQuery(
    trpc.vendorDispute.getDisputeById.queryOptions({ disputeId }),
  );

  // Calculate days remaining for OPEN disputes
  const daysRemaining =
    dispute.status === DisputeStatus.OPEN && dispute.deadline
      ? DateFormatter.businessDaysUntil(new Date(dispute.deadline), [0, 6])
      : null;

  // Check if dispute is resolved
  const isResolved =
    dispute.status === DisputeStatus.RESOLVED ||
    dispute.status === DisputeStatus.AUTO_RESOLVED;

  // Check if additional evidence was requested
  const additionalEvidenceRequested =
    dispute.status === DisputeStatus.AWAITING_EVIDENCE ||
    (dispute.additionalEvidence && dispute.additionalEvidence.length > 0);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-12 space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-4 pb-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            Dispute Details
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            ID: {disputeId.slice(-12).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Case Overview + Financial Impact (side-by-side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CaseOverviewCard
            status={dispute.status}
            daysRemaining={daysRemaining}
            resolvedAt={dispute.resolvedAt}
          />
        </div>
        <div>
          <FinancialImpactCard
            frozenAmount={dispute.frozenAmount}
            penaltyAmount={dispute.penaltyAmount}
            refundedAmount={
              dispute.outcome === DisputeOutcome.UPHELD
                ? dispute.frozenAmount
                : 0
            }
            status={dispute.status}
            outcome={dispute.outcome}
          />
        </div>
      </div>

      {/* Timeline */}
      <DisputeTimeline
        status={dispute.status}
        openedAt={dispute.openedAt}
        resolvedAt={dispute.resolvedAt}
        additionalEvidenceRequested={additionalEvidenceRequested}
      />

      {/* Complaint */}
      <div className="rounded-lg border shadow-sm p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Customer's Complaint
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {dispute.reason}
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          Submitted on{" "}
          {new Date(dispute.openedAt).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Evidence sections */}
      {dispute.evidence && dispute.evidence.length > 0 && (
        <EvidenceGallery
          evidence={dispute.evidence}
          title="Customer's Evidence"
          description="Images and files submitted by the customer"
        />
      )}

      {additionalEvidenceRequested &&
        dispute.additionalEvidence &&
        dispute.additionalEvidence.length > 0 && (
          <EvidenceGallery
            evidence={dispute.additionalEvidence}
            title="Additional Evidence"
            description="Evidence submitted in response to platform request"
          />
        )}

      {/* Resolution card (shown only when resolved) */}
      {isResolved && dispute.outcome && (
        <>
          <Separator />
          <ResolutionCard
            outcome={dispute.outcome}
            resolvedAt={dispute.resolvedAt!}
            resolvedBy={dispute.resolvedBy}
            penaltyAmount={dispute.penaltyAmount}
            frozenAmount={dispute.frozenAmount}
          />
        </>
      )}

      {/* What happens next section */}
      <WhatHappensNextSection status={dispute.status} />

      {/* Support section */}
      <VendorSupportSection />
    </main>
  );
}

/**
 * Vendor Dispute Detail Page
 * Production-grade case management dashboard for vendors
 */
export default async function VendorDisputeDetailPage({
  params,
}: {
  params: Promise<{ store_id: string; disputeId: string }>;
}) {
  const { store_id, disputeId } = await params;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 animate-pulse">
            <div className="h-12 rounded-lg bg-muted w-40" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-lg bg-muted" />
            ))}
          </div>
        }
      >
        <VendorDisputeDetailContent storeId={store_id} disputeId={disputeId} />
      </Suspense>
    </ErrorBoundary>
  );
}
