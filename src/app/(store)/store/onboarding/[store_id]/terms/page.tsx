import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import TermsPage from "@/modules/store/onboarding/terms";
import { redirect } from "next/navigation";
import React from "react";

async function page() {
  const store = await getStoreFromCookie();
  if (!store) {
    redirect(`/login`);
  }
  return <TermsPage storeId={store?.id} />;
}

export default page;
