import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";
import Link from "next/link";

/**
 * Vendor Support Section - Professional help and policy links
 * Positioned at the bottom for vendors who need additional information
 */
export function VendorSupportSection() {
  return (
    <Card className="border shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-foreground">
                Need Help?
              </p>
              <p className="text-xs text-muted-foreground">
                Our support team is available 24/7 to answer questions about
                disputes and the resolution process.
              </p>
              <div className="flex gap-3 pt-1">
                <Link
                  href="/vendor/support/disputes"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Dispute Support
                </Link>
                <span className="text-xs text-muted-foreground">·</span>
                <Link
                  href="/policies/disputes"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Dispute Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
