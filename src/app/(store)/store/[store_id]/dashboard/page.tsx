import { Suspense } from "react";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import StoreDashboardPage from "@/modules/store/components/dashboard";
import { StoreDashboardSkeleton } from "@/modules/skeletons/store-dashboard-skeleton";

async function Page({ params }: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.store.getById.queryOptions({ id: store_id })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<StoreDashboardSkeleton />}>
        <StoreDashboardPage store_id={store_id} error="" />
      </Suspense>
    </HydrationBoundary>
  );
}

export default Page;
