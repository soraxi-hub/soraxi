import ShippingPage from "@/modules/store/onboarding/shipping";
import React from "react";

async function page({ params }: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await params;

  return <ShippingPage storeId={store_id} />;
}

export default page;
