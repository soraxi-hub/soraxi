import { Metadata } from "next";
import { WaitlistStatusPage } from "@/modules/store/waitlist/waitlist-status-page";

export const metadata: Metadata = {
  title: "Vendor Application Status",
  description: "Check the status of your vendor waitlist application.",
};

export default async function ProductUploadPage() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <WaitlistStatusPage />
      </div>
    </div>
  );
}
