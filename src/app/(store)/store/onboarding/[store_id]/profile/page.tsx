import StoreProfilePage from "@/modules/store/onboarding/store-profile";
import React from "react";

async function page({ params }: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await params;

  return <StoreProfilePage storeId={store_id} />;
}

export default page;
