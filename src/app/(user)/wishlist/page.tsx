import { QueryBoundary } from "@/components/errors/query-boundary";
import { WishlistSkeleton } from "@/modules/skeletons/wishlist-skeleton";
import { Wishlist } from "@/modules/user/wishlist";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { Suspense } from "react";

import type { Metadata } from "next";
import { generateUserMetadata } from "@/lib/helpers/generate-user-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateUserMetadata(
    "My Wishlist",
    "Easily access and manage your saved products. Keep track of items you love and get quick access when you're ready to buy."
  );
}

async function Page() {
  prefetch(trpc.wishlist.getByUserId.queryOptions());
  return (
    <HydrateClient>
      <QueryBoundary>
        <Suspense fallback={<WishlistSkeleton />}>
          <Wishlist />
        </Suspense>
      </QueryBoundary>
    </HydrateClient>
  );
}

export default Page;
