"use client";

import { DisputeOutcome, DisputeResolvedBy } from "@/enums/financial.enums";
import { outcomeConfig } from "@/config/dispute-config";
import { formatNaira } from "@/lib/utils/naira";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DisputeOutcomeCardProps {
  outcome: DisputeOutcome;
  resolvedAt: Date | null;
  resolvedBy: DisputeResolvedBy | null;
  frozenAmount?: number;
}

export function DisputeOutcomeCard({
  outcome,
  resolvedAt,
  resolvedBy,
  frozenAmount,
}: DisputeOutcomeCardProps) {
  const config = outcomeConfig[outcome];
  const OutcomeIcon = config.icon;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Outcome
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-start gap-3">
          <OutcomeIcon className={`h-5 w-5 mt-0.5 ${config.color}`} />
          <div>
            <p className={`font-semibold ${config.color}`}>{config.label}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {config.description}
            </p>
            {resolvedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Resolved on{" "}
                {new Date(resolvedAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {resolvedBy === DisputeResolvedBy.SYSTEM && " · Auto-resolved"}
              </p>
            )}
          </div>
        </div>

        {/* Refund amount if upheld */}
        {outcome === DisputeOutcome.UPHELD &&
          frozenAmount &&
          frozenAmount > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <p className="text-sm text-green-800 dark:text-green-300">
                Refund amount:{" "}
                <span className="font-semibold">
                  {formatNaira(frozenAmount)}
                </span>
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
