import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatNaira } from "@/lib/utils/naira";
import { DisputeStatus, DisputeOutcome } from "@/enums/financial.enums";

interface FinancialImpactCardProps {
  frozenAmount: number;
  penaltyAmount: number;
  refundedAmount?: number;
  status: DisputeStatus;
  outcome?: DisputeOutcome | null;
}

/**
 * Financial Impact Card - Prominently displays vendor's financial exposure
 * This is often the first thing vendors care about
 */
export function FinancialImpactCard({
  frozenAmount,
  penaltyAmount,
  // refundedAmount,
  status,
  outcome,
}: FinancialImpactCardProps) {
  const isResolved =
    status === DisputeStatus.RESOLVED || status === DisputeStatus.AUTO_RESOLVED;

  return (
    <Card className="border shadow-sm bg-red-50/30 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Financial Impact
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Frozen funds */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount Frozen</span>
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
            {formatNaira(frozenAmount)}
          </span>
        </div>

        {/* Penalty amount */}
        {penaltyAmount > 0 && (
          <div className="flex items-center justify-between py-2 border-t border-red-200/50 dark:border-red-900/50">
            <span className="text-sm text-muted-foreground">
              Penalty Applied
            </span>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" />
              {formatNaira(penaltyAmount)}
            </span>
          </div>
        )}

        {/* Refunded to customer */}
        {isResolved && outcome === DisputeOutcome.UPHELD && (
          <div className="flex items-center justify-between py-2 border-t border-red-200/50 dark:border-red-900/50">
            <span className="text-sm text-muted-foreground">
              Refunded to Customer
            </span>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              {formatNaira(frozenAmount)}
            </span>
          </div>
        )}

        {/* Released funds */}
        {isResolved && outcome === DisputeOutcome.REJECTED && (
          <div className="flex items-center justify-between py-2 border-t border-green-200/50 dark:border-green-900/50">
            <span className="text-sm text-muted-foreground">
              Funds Released
            </span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatNaira(frozenAmount)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
