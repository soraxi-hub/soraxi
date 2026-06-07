"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function SupportSection() {
  return (
    <Card className="border-0 shadow-sm bg-muted/30">
      <CardContent className="pt-4 pb-4">
        <div className="flex gap-3">
          <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Need help with your dispute?
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              If you have questions about this dispute or need additional assistance, please{" "}
              <Link href="/support" className="text-primary font-medium hover:underline">
                contact our support team
              </Link>
              . We're available to help 24/7.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
