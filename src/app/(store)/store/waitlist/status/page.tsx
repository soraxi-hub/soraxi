import { Metadata } from "next";
import { WaitlistStatusPage } from "@/modules/store/waitlist/waitlist-status-page";

export const metadata: Metadata = {
  title: "Vendor Status",
  description:
    "Apply to become a vendor on Soraxi. Share your business details, product samples, and proof of business to join our curated waitlist.",
};

/**
 * Vendor Application Waitlist Page
 * Page for ... complete the statement
 */
export default async function ProductUploadPage() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <WaitlistStatusPage />
      </div>
    </div>
  );
}
