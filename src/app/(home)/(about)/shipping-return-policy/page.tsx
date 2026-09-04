import type { Metadata } from "next";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Shipping & Return Policy",
  description: `Delivery timelines, shipping costs, and return eligibility for orders placed on ${siteConfig.name}.`,
};

export default function ShippingReturnsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Shipping & Returns Policy
          </h1>
          <p className="text-muted-foreground text-lg">
            Clear guidelines on how {siteConfig.name} handles deliveries,
            returns, and refunds.
          </p>
          <Badge variant="outline" className="mt-2">
            Last updated: August 2026
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Shipping Policy */}
          <SoraxiCard>
            <SoraxiCardHeader>
              <SoraxiCardTitle className="flex items-center gap-2">
                1. Shipping Policy
              </SoraxiCardTitle>
            </SoraxiCardHeader>
            <SoraxiCardContent className="space-y-4">
              <p className="text-muted-foreground">
                {siteConfig.name} currently operates a vendor-managed shipping
                model to keep fulfillment simple and reliable:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  <strong>Vendor-Managed Deliveries:</strong> Vendors handle
                  deliveries directly, ensuring fast same-day or next-day
                  fulfillment within the campus.
                </li>
                <li>
                  <strong>Service Area:</strong> Delivery services are currently
                  focused on university campus orders or nearby areas and are
                  not yet available beyond campus locations.
                </li>
                <li>
                  <strong>Delivery Timelines:</strong> Same or next day delivery
                  within campus or nearby, depending on vendor scheduling and
                  product availability.
                </li>
              </ul>
            </SoraxiCardContent>
          </SoraxiCard>

          <Separator />

          {/* Returns & Refunds */}
          <SoraxiCard>
            <SoraxiCardHeader>
              <SoraxiCardTitle className="flex items-center gap-2">
                2. Returns & Refunds
              </SoraxiCardTitle>
            </SoraxiCardHeader>
            <SoraxiCardContent className="space-y-4">
              <p className="text-muted-foreground">
                We want you to shop with confidence. Our return and refund
                process is backed by {siteConfig.name}’s escrow system to
                protect both buyers and sellers.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  <strong>Return Window:</strong> Items may be returned within 7
                  days of delivery if defective, damaged, or not as described.
                </li>
                <li>
                  <strong>Condition:</strong> Products must be unused, in
                  original packaging, and accompanied by proof of purchase.
                </li>
                <li>
                  <strong>Refunds:</strong> Payments are released from escrow
                  only after the return request is approved. Refunds are
                  processed within 5 business days.
                </li>
                <li>
                  <strong>Non-Returnable Items:</strong> Perishable goods,
                  intimate items, or customized products are not eligible for
                  return unless faulty.
                </li>
              </ul>
            </SoraxiCardContent>
          </SoraxiCard>

          <Separator />

          {/* Additional Notes */}
          <SoraxiCard>
            <SoraxiCardHeader>
              <SoraxiCardTitle className="flex items-center gap-2">
                3. Additional Information
              </SoraxiCardTitle>
            </SoraxiCardHeader>
            <SoraxiCardContent className="space-y-2 text-muted-foreground">
              <p>• Shipping fees are calculated at checkout.</p>
              <p>
                • Vendors who repeatedly fail to meet shipping or return
                standards may face penalties or account suspension.
              </p>
            </SoraxiCardContent>
          </SoraxiCard>
        </div>
      </div>
    </div>
  );
}
