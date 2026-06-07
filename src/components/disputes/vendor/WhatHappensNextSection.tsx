import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { DisputeStatus } from "@/enums/financial.enums";

interface WhatHappensNextSectionProps {
  status: DisputeStatus;
}

/**
 * What Happens Next Section - Provides clarity on next steps for vendors
 * Reduces support inquiries by setting clear expectations
 */
export function WhatHappensNextSection({
  status,
}: WhatHappensNextSectionProps) {
  const getNextStepsText = (): string => {
    switch (status) {
      case DisputeStatus.OPEN:
        return "Our team is actively reviewing this dispute. You will receive a notification once a decision has been made, typically within 3-5 business days.";

      case DisputeStatus.AWAITING_EVIDENCE:
        return "We've requested additional evidence from the customer. No action is required from you. Once they submit the evidence, our review will continue.";

      case DisputeStatus.RESOLVED:
      case DisputeStatus.AUTO_RESOLVED:
        return "This case is closed. All financial adjustments have been processed. You can review the complete resolution details above.";

      default:
        return "";
    }
  };

  const getAdditionalInfo = (): string | null => {
    switch (status) {
      case DisputeStatus.OPEN:
        return "Your funds will remain frozen during the review process.";
      case DisputeStatus.AWAITING_EVIDENCE:
        return "Your funds will remain frozen until additional evidence is submitted and reviewed.";
      case DisputeStatus.RESOLVED:
      case DisputeStatus.AUTO_RESOLVED:
        return "If you disagree with this decision, you can contact our support team within 30 days.";
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getNextStepsText()}
            </p>
            {getAdditionalInfo() && (
              <p className="text-xs text-muted-foreground italic">
                {getAdditionalInfo()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
