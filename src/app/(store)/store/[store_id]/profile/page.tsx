import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { Suspense } from "react";
import StoreProfilePage from "@/modules/store/profile/store-profile-page";
import { QueryBoundary } from "@/components/errors/query-boundary";
import { StoreProfileSkeleton } from "@/modules/skeletons/store-profile-skeleton";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Store Profile",
    "Manage your store's public profile, branding, and description."
  );
}

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
