"use client";

import { formatNaira } from "@/lib/utils/naira";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancialSummaryCardProps {
  frozenAmount: number;
  openedAt: Date;
  refundAmount?: number;
}

export function FinancialSummaryCard({
  frozenAmount,
  openedAt,
  refundAmount,
}: FinancialSummaryCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-2">
        <div className="flex justify-between items-center py-1.5 border-b border-border/50">
          <span className="text-sm text-muted-foreground">
            Amount in dispute
          </span>
          <span className="text-sm font-semibold">
            {formatNaira(frozenAmount)}
          </span>
        </div>
        {refundAmount && refundAmount > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Refund issued</span>
            <span className="text-sm font-semibold text-soraxi-green">
              {formatNaira(refundAmount)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center py-1.5">
          <span className="text-sm text-muted-foreground">Opened on</span>
          <span className="text-sm font-medium">
            {new Date(openedAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
