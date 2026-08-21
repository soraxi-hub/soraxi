import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { Suspense } from "react";
import StoreProfilePage from "@/modules/store/profile/store-profile-page";
import { QueryBoundary } from "@/components/errors/query-boundary";
import { StoreProfileSkeleton } from "@/modules/skeletons/store-profile-skeleton";

async function Page() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.storeProfile.getStoreProfilePrivate.queryOptions()
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <QueryBoundary>
        <Suspense fallback={<StoreProfileSkeleton />}>
          <StoreProfilePage />
        </Suspense>
      </QueryBoundary>
    </HydrationBoundary>
  );
}

export default Page;
