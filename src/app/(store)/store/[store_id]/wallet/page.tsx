// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import StoreWalletPage from "./waller-client-side/store-wallet-page";

interface StoreWithdrawalDetailPageProps {
  params: Promise<{
    store_id: string;
  }>;
}

/**
 * Store Withdrawal Request Detail Page
 * Displays comprehensive details of a single withdrawal request for the store owner.
 */
export default async function StoreWithdrawalDetailPage({
  params,
}: StoreWithdrawalDetailPageProps) {
  const { store_id } = await params;

  return <StoreWalletPage storeId={store_id} />;
}
