import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import OrderDetailsPage from "@/modules/user/user-order-details-page";
import { OrderDetailsSkeleton } from "@/modules/skeletons/user-order-details-skeleton";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  prefetch(trpc.order.getByOrderId.queryOptions({ orderId: slug }));

  return (
    <HydrateClient>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<OrderDetailsSkeleton />}>
          <OrderDetailsPage slug={slug} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}
