import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ShippingMethodForm from "@/modules/store/shipping/shipping-methods";

async function Page() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.storeShipping.getStoreShippingMethods.queryOptions()
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Suspense fallback={<div>Loading...</div>}>
          <ShippingMethodForm />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
}

export default Page;
