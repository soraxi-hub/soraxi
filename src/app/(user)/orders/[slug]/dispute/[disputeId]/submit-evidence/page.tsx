"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { QueryBoundary } from "@/components/errors/query-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DisputeStatus } from "@/enums/financial.enums";
import { DisputePageHeader } from "@/modules/user/disputes/dispute-page-header";
import { SubmitEvidenceForm } from "@/modules/user/disputes/submit-evidence-form";

/**
 * Inner page component — data fetched via Suspense
 */
function SubmitEvidenceContent({
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

  const statusPageHref = `/orders/${orderId}/dispute/${disputeId}`;

  return (
    <main className="max-w-5xl mx-auto px-4 pb-10 space-y-4">
      <div className="pt-4">
        <DisputePageHeader orderId={orderId} disputeId={disputeId} />
      </div>

      {dispute.status === DisputeStatus.AWAITING_EVIDENCE ? (
        <>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4 space-y-1">
              <p className="text-sm font-medium">
                We need a bit more evidence before we can decide this dispute.
              </p>
              {dispute.additionalEvidenceDeadline && (
                <p className="text-xs text-muted-foreground">
                  Submit before{" "}
                  {new Date(
                    dispute.additionalEvidenceDeadline,
                  ).toLocaleString()}
                  , or the dispute will be closed automatically.
                </p>
              )}
            </CardContent>
          </Card>

          <SubmitEvidenceForm orderId={orderId} disputeId={disputeId} />
        </>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              This dispute is no longer waiting on additional evidence.
            </p>
            <Button asChild variant="outline">
              <Link href={statusPageHref}>View dispute status</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

/**
 * Page export with Suspense + QueryBoundary
 */
export default async function SubmitEvidencePage({
  params,
}: {
  params: Promise<{ slug: string; disputeId: string }>;
}) {
  const { slug: orderId, disputeId } = await params;
  return (
    <QueryBoundary>
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 pt-10 space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <SubmitEvidenceContent orderId={orderId} disputeId={disputeId} />
      </Suspense>
    </QueryBoundary>
  );
}
