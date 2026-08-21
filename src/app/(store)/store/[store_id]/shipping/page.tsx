import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { Suspense } from "react";
import ShippingMethodForm from "@/modules/store/shipping/shipping-methods";
import ShippingMethodFormSkeleton from "@/modules/skeletons/shipping-method-form-skeleton";
import { QueryBoundary } from "@/components/errors/query-boundary";

import type { Metadata } from "next";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Shipping Setup",
    "Configure and manage your store's shipping methods. Set delivery options, update shipping rates, and ensure a smooth fulfillment process for customer orders."
  );
}

async function Page() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.storeShipping.getStoreShippingMethods.queryOptions()
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <QueryBoundary>
        <Suspense fallback={<ShippingMethodFormSkeleton />}>
          <ShippingMethodForm />
        </Suspense>
      </QueryBoundary>
    </HydrationBoundary>
  );
}

export default Page;
