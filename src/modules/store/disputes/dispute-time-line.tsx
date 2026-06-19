import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle } from "lucide-react";
import { DisputeStatus } from "@/enums/financial.enums";

interface TimelineEvent {
  label: string;
  date?: Date | null;
  completed: boolean;
}

interface DisputeTimelineProps {
  status: DisputeStatus;
  openedAt: Date;
  resolvedAt?: Date | null;
  additionalEvidenceRequested?: boolean;
}

/**
 * Dispute Timeline - Shows case progression chronologically
 * Helps vendors understand where they are in the dispute process
 */
export function DisputeTimeline({
  status,
  openedAt,
  resolvedAt,
  additionalEvidenceRequested,
}: DisputeTimelineProps) {
  const isResolved =
    status === DisputeStatus.RESOLVED || status === DisputeStatus.AUTO_RESOLVED;

  const events: TimelineEvent[] = [
    {
      label: "Dispute Opened",
      date: openedAt,
      completed: true,
    },
    {
      label: "Customer Evidence Submitted",
      completed:
        status !== DisputeStatus.OPEN &&
        status !== DisputeStatus.AWAITING_EVIDENCE,
    },
    ...(additionalEvidenceRequested
      ? [
          {
            label: "Additional Evidence Requested",
            completed: true,
          },
          {
            label: "Additional Evidence Received",
            completed:
              status === DisputeStatus.RESOLVED ||
              status === DisputeStatus.AUTO_RESOLVED,
          },
        ]
      : []),
    {
      label: "Review Completed",
      date: resolvedAt,
      completed: isResolved,
    },
  ];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-base font-semibold">
          Dispute Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-0">
          {events.map((event, index) => {
            const isLast = index === events.length - 1;
            return (
              <div key={index} className="flex gap-4 pb-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  {event.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  {!isLast && <div className="w-0.5 h-8 bg-border mt-2" />}
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0 pt-1">
                  <p
                    className={`text-sm font-medium ${
                      event.completed
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {event.label}
                  </p>
                  {event.date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(event.date).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
