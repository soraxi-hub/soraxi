"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisputeStatus } from "@/enums/financial.enums";

interface WhatHappensNextSectionProps {
  status: DisputeStatus;
  actionRequired: boolean;
}

export function WhatHappensNextSection({
  status,
  actionRequired,
}: WhatHappensNextSectionProps) {
  const nextStepContent: Record<DisputeStatus, string> = {
    [DisputeStatus.OPEN]:
      "Our team will review all submitted evidence and respond within 5 business days. We may ask for additional information if needed. You'll receive an email notification with our decision.",
    [DisputeStatus.AWAITING_EVIDENCE]:
      "Please submit additional evidence within 48 hours. Without additional evidence, we may close your dispute without further review. Submit photos or documents that clearly show the issue.",
    [DisputeStatus.RESOLVED]:
      "Your dispute has been reviewed and decided. Check the resolution details above to see the outcome. If you received a refund, it will be processed to your original payment method within 5-10 business days.",
    [DisputeStatus.AUTO_RESOLVED]:
      "Your dispute was automatically resolved in your favour because we didn't respond within the required time. A refund has been issued and will appear in your account within 5-10 business days.",
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          What Happens Next
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-3">
        <p className="text-sm text-foreground leading-relaxed">
          {nextStepContent[status]}
        </p>
        {actionRequired && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Action Required
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-400 mt-1">
              You need to submit additional evidence to move your dispute
              forward.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
