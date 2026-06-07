"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComplaintCardProps {
  reason: string;
}

export function ComplaintCard({ reason }: ComplaintCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Your Complaint
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="text-sm text-foreground leading-relaxed">
          {reason}
        </p>
      </CardContent>
    </Card>
  );
}
