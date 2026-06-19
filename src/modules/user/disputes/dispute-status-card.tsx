"use client";

import Link from "next/link";
import { Clock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DisputeStatus } from "@/enums/financial.enums";
import { statusConfig } from "@/config/dispute-config";
import { DateFormatter } from "@/lib/utils/date-formatter";

interface DisputeStatusCardProps {
  status: DisputeStatus;
  deadline: Date | null;
  additionalEvidenceDeadline: Date | null;
  orderId: string;
  disputeId: string;
}

export function DisputeStatusCard({
  status,
  deadline,
  additionalEvidenceDeadline,
  orderId,
  disputeId,
}: DisputeStatusCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const daysRemaining =
    status === DisputeStatus.OPEN && deadline
      ? DateFormatter.businessDaysUntil(new Date(deadline), [0, 6])
      : null;

  const evidenceDeadlineRemaining =
    status === DisputeStatus.AWAITING_EVIDENCE && additionalEvidenceDeadline
      ? Math.max(
          0,
          Math.ceil(
            (new Date(additionalEvidenceDeadline).getTime() - Date.now()) /
              (1000 * 60 * 60),
          ),
        )
      : null;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${config.color}`}>
            <StatusIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {config.label}
              </span>
              <Badge
                variant="outline"
                className={`text-xs ${config.color} border-current`}
              >
                {status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {config.description}
            </p>

            {/* Deadline countdown for OPEN disputes */}
            {daysRemaining !== null && (
              <div className="mt-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {daysRemaining === 0
                    ? "Resolution due today"
                    : `${daysRemaining} business day${daysRemaining !== 1 ? "s" : ""} remaining`}
                </span>
              </div>
            )}

            {/* Evidence submission deadline */}
            {evidenceDeadlineRemaining !== null && (
              <div className="mt-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {evidenceDeadlineRemaining === 0
                    ? "Submission window closing soon"
                    : `${evidenceDeadlineRemaining}h remaining to submit evidence`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Additional evidence submission button */}
        {status === DisputeStatus.AWAITING_EVIDENCE && (
          <Link
            href={`/orders/${orderId}/dispute/${disputeId}/submit-evidence`}
          >
            <Button className="w-full mt-4 bg-soraxi-green hover:bg-soraxi-green-hover text-white">
              <Upload className="h-4 w-4 mr-2" />
              Submit Additional Evidence
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
