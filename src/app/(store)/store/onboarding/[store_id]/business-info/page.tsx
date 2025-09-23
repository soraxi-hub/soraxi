import BusinessInfoPage from "@/modules/store/onboarding/business-info";
import React from "react";

async function page({ params }: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await params;

  return <BusinessInfoPage storeId={store_id} />;
}

export default page;
