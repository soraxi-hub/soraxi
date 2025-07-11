import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import BusinessInfoPage from "@/modules/store/onboarding/business-info";
import { redirect } from "next/navigation";
import React from "react";

async function page() {
  const store = await getStoreFromCookie();
  if (!store) {
    redirect(`/login`);
  }
  return <BusinessInfoPage storeId={store?.id} />;
}

export default page;
