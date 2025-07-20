import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import StoreProfilePage from "@/modules/store/onboarding/store-profile";
import { redirect } from "next/navigation";
import React from "react";

async function page() {
  const store = await getStoreFromCookie();
  if (!store) {
    redirect(`/login`);
  }
  return <StoreProfilePage storeId={store?.id} />;
}

export default page;
