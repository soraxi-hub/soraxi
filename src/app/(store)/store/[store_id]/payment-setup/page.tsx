import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import UpdatePayoutAccount from "@/modules/store/payment-setup/payout-setup-page";
import { redirect } from "next/navigation";

async function page() {
  const storeTokenData = await getStoreFromCookie();
  if (!storeTokenData) {
    redirect(`/login`);
  }
  return <UpdatePayoutAccount storeId={storeTokenData?.id} />;
}

export default page;
