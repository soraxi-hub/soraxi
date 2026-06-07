import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { vendorOutcomeConfig } from "@/config/vendor-dispute-config";
import { DisputeOutcome, DisputeResolvedBy } from "@/enums/financial.enums";

interface ResolutionCardProps {
  outcome: DisputeOutcome;
  resolvedAt: Date;
  resolvedBy: DisputeResolvedBy | null;
  penaltyAmount?: number;
  frozenAmount?: number;
}

/**
 * Resolution Card - Displays the final dispute decision and consequences
 * Only shown when dispute is resolved
 */
export function ResolutionCard({
  outcome,
  resolvedAt,
  resolvedBy,
  // penaltyAmount = 0,
  // frozenAmount = 0,
}: ResolutionCardProps) {
  const config = vendorOutcomeConfig[outcome];

  const getIcon = () => {
    switch (outcome) {
      case DisputeOutcome.UPHELD:
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case DisputeOutcome.REJECTED:
        return (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        );
      case DisputeOutcome.INCONCLUSIVE:
        return (
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        );
      default:
        return null;
    }
  };

  const getBgColor = () => {
    switch (outcome) {
      case DisputeOutcome.UPHELD:
        return "bg-red-50/30 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/50";
      case DisputeOutcome.REJECTED:
        return "bg-green-50/30 dark:bg-green-950/20 border-green-200/50 dark:border-green-900/50";
      case DisputeOutcome.INCONCLUSIVE:
        return "bg-amber-50/30 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/50";
      default:
        return "";
    }
  };

  return (
    <Card className={`border shadow-sm ${getBgColor()}`}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center gap-2">
          {getIcon()}
          <CardTitle className="text-base font-semibold">
            Resolution Decision
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pb-4 space-y-4">
        {/* Outcome label */}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {config.label}
          </p>
        </div>

        {/* Explanation */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {config.explanation}
        </p>

        {/* Vendor message */}
        <p className="text-sm text-foreground">{config.vendorMessage}</p>

        {/* Resolution metadata */}
        <div className="flex flex-col gap-2 text-xs text-muted-foreground border-t border-border/50 pt-3">
          <div className="flex justify-between">
            <span>Resolved on</span>
            <span className="font-medium text-foreground">
              {new Date(resolvedAt).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          {resolvedBy === DisputeResolvedBy.SYSTEM && (
            <div className="flex justify-between">
              <span>Resolution type</span>
              <span className="font-medium text-foreground">Auto-resolved</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
