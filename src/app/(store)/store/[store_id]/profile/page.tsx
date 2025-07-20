import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import StoreProfile from "@/modules/store/profile/store-profile";
import { ErrorFallback } from "@/components/error-fallback";

async function Page() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.storeProfile.getStoreProfilePrivate.queryOptions()
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<div>Loading...</div>}>
          <StoreProfile />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
}

export default Page;
