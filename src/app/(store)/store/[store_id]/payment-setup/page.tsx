import UpdatePayoutAccount from "@/modules/store/payment-setup/payout-setup-page";
import type { Metadata } from "next";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Payout Setup",
    "Set up or update your payout account to securely receive store earnings. Manage your payment details and ensure smooth withdrawals from your sales."
  );
}

async function page({ params }: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await params;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <UpdatePayoutAccount storeId={store_id} />
    </ErrorBoundary>
  );
}

export default page;
