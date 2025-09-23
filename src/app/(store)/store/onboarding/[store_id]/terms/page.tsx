import TermsPage from "@/modules/store/onboarding/terms";
import React from "react";

async function page({ params }: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await params;

  return <TermsPage storeId={store_id} />;
}

export default page;
