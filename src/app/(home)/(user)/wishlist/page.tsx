import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { WishlistSkeleton } from "@/modules/skeletons/wishlist-skeleton";
import { Wishlist } from "@/modules/user/wishlist";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

async function Page() {
  const userId = await getUserFromCookie();

  if (!userId) return redirect(`/sign-in`);

  prefetch(trpc.wishlist.getByUserId.queryOptions());
  return (
    <HydrateClient>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Suspense fallback={<WishlistSkeleton />}>
          <Wishlist />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}

export default Page;
