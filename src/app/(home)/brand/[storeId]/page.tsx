import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { caller, getQueryClient, trpc } from "@/trpc/server";
import { cache, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { PublicStoreProfile } from "@/modules/public-store/public-store-profile";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { PublicStoreProfileSkeleton } from "@/modules/skeletons/public-store-profile-skeleton";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    storeId: string;
  }>;
}

const getProduct = cache(async (storeId: string) => {
  const store = await caller.publicStore.getStoreProfilePublic({ storeId });
  return store;
});

export async function generateMetadata({ params }: PageProps) {
  const { storeId } = await params;
  const store = await getProduct(storeId);

  if (!store) return {};

  return {
    title: `${store.name}`,
    description: store.description,
    openGraph: {
      title: store.name,
      description: store.description,
    },
    twitter: {
      card: "summary_large_image",
      title: store.name,
      description: store.description,
    },
  };
}

async function Page({ params }: PageProps) {
  const { storeId } = await params;

  try {
    const queryClient = getQueryClient();
    await queryClient.prefetchQuery(
      trpc.publicStore.getStoreProfilePublic.queryOptions({ storeId })
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
  } catch (error) {
    notFound();
  }
}

export default Page;
