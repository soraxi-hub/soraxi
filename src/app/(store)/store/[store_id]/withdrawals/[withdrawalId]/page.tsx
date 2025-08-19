// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import StoreWithdrawalDetail from "@/modules/store/finance/withdrawal-requests/withdrawal-detail";
import type { Metadata } from "next";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Withdrawal Details",
    "View and manage the details of a specific withdrawal request, including payout status, transaction amount, and history of transfers for your store."
  );
}

interface StoreWithdrawalDetailPageProps {
  params: Promise<{
    store_id: string;
    withdrawalId: string;
  }>;
}

/**
 * Store Withdrawal Request Detail Page
 * Displays comprehensive details of a single withdrawal request for the store owner.
 */
export default async function StoreWithdrawalDetailPage({
  params,
}: StoreWithdrawalDetailPageProps) {
  const { store_id, withdrawalId } = await params;

  return (
    <StoreWithdrawalDetail storeId={store_id} withdrawalId={withdrawalId} />
  );
}
