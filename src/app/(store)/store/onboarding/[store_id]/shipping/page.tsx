import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import ShippingPage from "@/modules/store/onboarding/shipping";
import { redirect } from "next/navigation";
import React from "react";

async function page() {
  const store = await getStoreFromCookie();
  if (!store) {
    redirect(`/login`);
  }
  return <ShippingPage storeId={store?.id} />;
}

export default page;
