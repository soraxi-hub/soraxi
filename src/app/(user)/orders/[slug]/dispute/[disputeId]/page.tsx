"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { statusConfig as statusConfigMap } from "@/config/dispute-config";
import { DisputeOutcome } from "@/enums/financial.enums";
import { SupportSection } from "@/modules/user/disputes/support-section";
import { EvidenceSection } from "@/modules/user/disputes/evidence-section";
import { ComplaintCard } from "@/modules/user/disputes/complaint-card";
import { FinancialSummaryCard } from "@/modules/user/disputes/financial-summary-card";
import { WhatHappensNextSection } from "@/modules/user/disputes/what-happens-next-section";
import { DisputeTimeline } from "@/modules/user/disputes/dispute-time-line";
import { DisputeOutcomeCard } from "@/modules/user/disputes/dispute-outcome-card";
import { DisputePageHeader } from "@/modules/user/disputes/dispute-page-header";
import { DisputeStatusCard } from "@/modules/user/disputes/dispute-status-card";

// http://localhost:3000/orders/6a1de4e8f957fa34e9f0b5fe/dispute/6a1dfa8e72c3600e2235c18d

/**
 * Inner page component — data fetched via Suspense
 */
function DisputeStatusContent({
  orderId,
  disputeId,
}: {
  orderId: string;
  disputeId: string;
}) {
  const trpc = useTRPC();

  const { data: dispute } = useSuspenseQuery(
    trpc.customerDispute.getDisputeById.queryOptions({ disputeId }),
  );

  const config = statusConfigMap[dispute.status];
  const actionRequired = config.actionRequired;

  return (
    <main className="max-w-5xl mx-auto px-4 pb-10 space-y-4">
      {/* Page header */}
      <div className="pt-4">
        <DisputePageHeader orderId={orderId} disputeId={disputeId} />
      </div>

      {/* Status card */}
      <DisputeStatusCard
        status={dispute.status}
        deadline={dispute.deadline}
        additionalEvidenceDeadline={dispute.additionalEvidenceDeadline}
        orderId={orderId}
        disputeId={disputeId}
      />

      {/* Outcome card — shown after resolution */}
      {dispute.outcome && (
        <DisputeOutcomeCard
          outcome={dispute.outcome}
          resolvedAt={dispute.resolvedAt}
          resolvedBy={dispute.resolvedBy}
          frozenAmount={dispute.frozenAmount}
        />
      )}

      {/* Timeline section */}
      <DisputeTimeline
        status={dispute.status}
        openedAt={dispute.openedAt}
        resolvedAt={dispute.resolvedAt}
      />

      {/* What happens next section */}
      <WhatHappensNextSection
        status={dispute.status}
        actionRequired={actionRequired}
      />

      {/* Financial summary */}
      <FinancialSummaryCard
        frozenAmount={dispute.frozenAmount}
        openedAt={dispute.openedAt}
        refundAmount={
          dispute.outcome === DisputeOutcome.UPHELD
            ? dispute.frozenAmount
            : undefined
        }
      />

      {/* Complaint */}
      <ComplaintCard reason={dispute.reason} />

      {/* Evidence submitted */}
      {dispute.evidence && dispute.evidence.length > 0 && (
        <EvidenceSection
          title="Evidence Submitted"
          evidence={dispute.evidence}
        />
      )}

      {/* Additional evidence — shown if submitted */}
      {dispute.additionalEvidence && dispute.additionalEvidence.length > 0 && (
        <EvidenceSection
          title="Additional Evidence"
          evidence={dispute.additionalEvidence}
        />
      )}

      <Separator />

      {/* Support section */}
      <SupportSection />
    </main>
  );
}

/**
 * Page export with Suspense + ErrorBoundary
 */
export default async function DisputeStatusPage({
  params,
}: {
  params: Promise<{ orderId: string; disputeId: string }>;
}) {
  const { orderId, disputeId } = await params;
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 pt-10 space-y-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <DisputeStatusContent orderId={orderId} disputeId={disputeId} />
      </Suspense>
    </ErrorBoundary>
  );
}
