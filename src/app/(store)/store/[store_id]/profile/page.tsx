import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import StoreProfile from "@/modules/store/profile/store-profile";
import { ErrorFallback } from "@/components/error-fallback";
import { StoreProfileSkeleton } from "@/modules/skeletons/store-profile-skeleton";

async function Page() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.storeProfile.getStoreProfilePrivate.queryOptions()
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<StoreProfileSkeleton />}>
          <StoreProfile />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
}

export default Page;
