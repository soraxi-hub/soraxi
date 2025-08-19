import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import UpdatePayoutAccount from "@/modules/store/payment-setup/payout-setup-page";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Payout Setup",
    "Set up or update your payout account to securely receive store earnings. Manage your payment details and ensure smooth withdrawals from your sales."
  );
}

async function page() {
  const storeTokenData = await getStoreFromCookie();
  if (!storeTokenData) {
    redirect(`/login`);
  }
  return <UpdatePayoutAccount storeId={storeTokenData?.id} />;
}

export default page;
