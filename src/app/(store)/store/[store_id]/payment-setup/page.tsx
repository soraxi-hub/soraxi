import UpdatePayoutAccount from "@/modules/store/payment-setup/payout-setup-page";
import type { Metadata } from "next";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";
import { QueryBoundary } from "@/components/errors/query-boundary";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Payout Setup",
    "Set up or update your payout account to securely receive store earnings. Manage your payment details and ensure smooth withdrawals from your sales."
  );
}

async function page() {
  return (
    <QueryBoundary>
      {/* The store is derived from the session, not the URL — a payout
          destination must never be settable by changing a path segment. */}
      <UpdatePayoutAccount />
    </QueryBoundary>
  );
}

export default page;
