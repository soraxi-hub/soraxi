import { Metadata } from "next";
import { VendorWaitlistWizard } from "@/modules/store/waitlist";

export const metadata: Metadata = {
  title: "Vendor Waitlist",
  description:
    "Apply to become a vendor on Soraxi. Share your business details, product samples, and proof of business to join our curated waitlist.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * Vendor Application Waitlist Page
 * Page for ... complete the statement
 */
export default async function VendorWaitlistPage() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <VendorWaitlistWizard />
      </div>
    </div>
  );
}
