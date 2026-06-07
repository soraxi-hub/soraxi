"use client";

import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DisputeStatus } from "@/enums/financial.enums";

interface TimelineEvent {
  date: string;
  label: string;
  description: string;
  isCompleted: boolean;
}

interface DisputeTimelineProps {
  status: DisputeStatus;
  openedAt: Date;
  evidenceSubmittedAt?: string;
  additionalEvidenceRequestedAt?: string;
  additionalEvidenceSubmittedAt?: string;
  resolvedAt: Date | null;
}

export function DisputeTimeline({
  // status,
  openedAt,
  evidenceSubmittedAt,
  additionalEvidenceRequestedAt,
  additionalEvidenceSubmittedAt,
  resolvedAt,
}: DisputeTimelineProps) {
  const events: TimelineEvent[] = [
    {
      date: new Date(openedAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      label: "Dispute Opened",
      description: "You opened a dispute for this order",
      isCompleted: true,
    },
  ];

  if (evidenceSubmittedAt) {
    events.push({
      date: new Date(evidenceSubmittedAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      label: "Evidence Submitted",
      description: "You submitted evidence to support your dispute",
      isCompleted: true,
    });
  }

  if (additionalEvidenceRequestedAt) {
    events.push({
      date: new Date(additionalEvidenceRequestedAt).toLocaleDateString(
        "en-NG",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      ),
      label: "Additional Evidence Requested",
      description: "Our team requested more evidence to review your case",
      isCompleted: true,
    });
  }

  if (additionalEvidenceSubmittedAt) {
    events.push({
      date: new Date(additionalEvidenceSubmittedAt).toLocaleDateString(
        "en-NG",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      ),
      label: "Additional Evidence Submitted",
      description: "You submitted additional evidence",
      isCompleted: true,
    });
  }

  if (resolvedAt) {
    events.push({
      date: new Date(resolvedAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      label: "Dispute Resolved",
      description: "A decision was made on your dispute",
      isCompleted: true,
    });
  }

  // Only show timeline if there are events to display
  if (events.length <= 1) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-soraxi-green/20 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-soraxi-green" />
                </div>
                {index < events.length - 1 && (
                  <div className="w-0.5 h-12 bg-border mt-2" />
                )}
              </div>
              <div className="pb-4 flex-1">
                <p className="text-xs text-muted-foreground font-medium">
                  {event.date}
                </p>
                <p className="font-medium text-sm text-foreground mt-0.5">
                  {event.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {event.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
