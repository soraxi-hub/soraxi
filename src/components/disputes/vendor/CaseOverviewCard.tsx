import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { vendorStatusConfig } from "@/config/vendor-dispute-config";
import { DisputeStatus } from "@/enums/financial.enums";

interface CaseOverviewCardProps {
  status: DisputeStatus;
  daysRemaining: number | null;
  resolvedAt?: Date | null;
}

/**
 * Case Overview Card - Primary status section for vendor dispute dashboard
 * Shows current status, explanation, and timeline information
 */
export function CaseOverviewCard({
  status,
  daysRemaining,
  resolvedAt,
}: CaseOverviewCardProps) {
  const config = vendorStatusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className="border shadow-sm">
      <CardContent className="pb-3">
        <div className="space-y-4">
          {/* Status header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded ${config.badge}`}>
                <StatusIcon className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {config.label}
              </h2>
            </div>
            <Badge variant="outline" className="text-xs">
              {status}
            </Badge>
          </div>

          {/* Explanation */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.explanation}
          </p>

          {/* Timeline info */}
          {daysRemaining !== null && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 pt-2">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-medium">
                {daysRemaining === 0
                  ? "Decision due today"
                  : `Decision expected within ${daysRemaining} business day${daysRemaining !== 1 ? "s" : ""}`}
              </span>
            </div>
          )}

          {resolvedAt && (
            <div className="text-xs text-muted-foreground pt-2">
              Resolved on{" "}
              {new Date(resolvedAt).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
