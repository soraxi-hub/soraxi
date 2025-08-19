// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import StoreWalletPage from "./waller-client-side/store-wallet-page";

import type { Metadata } from "next";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Wallet",
    "Access and manage your store wallet. View earnings, request withdrawals, track payout history, and stay on top of your store’s finances with ease."
  );
}

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
