"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ConditionsCard,
  ProductsCard,
  SettlementCard,
  StatusOverviewCard,
  TimelineCard,
} from "../../../components/fund-release";

interface FundReleaseDetailProps {
  fundReleaseId: string;
}

export default function FundReleaseDetail({
  fundReleaseId,
}: FundReleaseDetailProps) {
  const trpc = useTRPC();

  const { data, isLoading } = useSuspenseQuery(
    trpc.storeFundRelease.getById.queryOptions({
      id: fundReleaseId,
    })
  );

  if (isLoading) {
    return <DetailLoadingSkeleton />;
  }

  const fundRelease = data.fundRelease;
  const subOrder = data.relatedSubOrder;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <StatusOverviewCard fundRelease={fundRelease} />

      {/* Settlement Details */}
      <SettlementCard settlement={fundRelease.settlement} />

      {/* Timeline / Conditions Met */}
      <ConditionsCard fundRelease={fundRelease} />

      {/* Release Timeline */}
      <TimelineCard fundRelease={fundRelease} />

      {/* Order Products */}
      {subOrder && <ProductsCard subOrder={subOrder} />}

      {/* Risk Indicators if any */}
      {fundRelease.riskIndicators &&
        fundRelease.riskIndicators.flags.length > 0 && (
          <RiskIndicatorsCard riskIndicators={fundRelease.riskIndicators} />
        )}
    </div>
  );
}

/**
 * Risk indicators card - Shows if any risk flags are present
 */
function RiskIndicatorsCard({ riskIndicators }: { riskIndicators: any }) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-orange-900">Risk Indicators</CardTitle>
        <CardDescription className="text-orange-800">
          Flags that may affect your payout
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {riskIndicators.flags?.map((flag: string, idx: number) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-full bg-orange-200 px-3 py-1 text-xs font-medium text-orange-900"
            >
              ⚠️ {flag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Detail loading skeleton
 */
function DetailLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}
