import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorFallback } from "@/components/errors/error-fallback";
import { PublicStoreProfile } from "@/modules/public-store/public-store-profile";
import { PublicStoreProfileSkeleton } from "@/modules/skeletons/public-store-profile-skeleton";
import { caller, getQueryClient, trpc } from "@/trpc/server";

interface PageProps {
  params: Promise<{
    storeId: string;
  }>;
}

/**
 * Wrapped in React `cache` so `generateMetadata` and the page body share a
 * single fetch per request.
 *
 * Returns `null` only when the store genuinely isn't there — a malformed id or
 * no match — so that case can become a real 404. Anything else (a database
 * blip, an unexpected failure) is rethrown: a transient outage must not be
 * reported to users and crawlers as "this store does not exist".
 */
const getStore = cache(async (storeId: string) => {
  try {
    return await caller.publicStore.getStoreProfilePublic({ storeId });
  } catch (error) {
    const code = error instanceof TRPCError ? error.code : undefined;

    if (code === "NOT_FOUND" || code === "BAD_REQUEST") return null;

    throw error;
  }
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { storeId } = await params;
  const data = await getStore(storeId);

  if (!data) return {};

  const { store, viewState } = data;

  return {
    title: store.storeName,
    description: store.description,
    // A store that isn't trading shouldn't be collecting search traffic it
    // can't serve. The tag is dropped again once the store goes active.
    robots:
      viewState === "pending" || viewState === "suspended"
        ? { index: false, follow: true }
        : undefined,
    openGraph: {
      title: store.storeName,
      description: store.description,
    },
    twitter: {
      card: "summary_large_image",
      title: store.storeName,
      description: store.description,
    },
  };
}

async function Page({ params }: PageProps) {
  const { storeId } = await params;

  // Resolved here rather than left to the client boundary: an unknown store
  // must return a 404, not a 200 carrying an error fallback.
  const data = await getStore(storeId);

  if (!data) notFound();

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.publicStore.getStoreProfilePublic.queryOptions({ storeId }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<PublicStoreProfileSkeleton />}>
          <PublicStoreProfile storeId={storeId} />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
}

export default Page;
