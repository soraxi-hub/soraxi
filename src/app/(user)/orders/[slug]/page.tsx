import type { Metadata } from "next";
import { Suspense } from "react";
import { QueryBoundary } from "@/components/errors/query-boundary";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import OrderDetailsPage from "@/modules/user/user-order-details-page";
import { OrderDetailsSkeleton } from "@/modules/skeletons/user-order-details-skeleton";
import { generateUserMetadata } from "@/lib/helpers/generate-user-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateUserMetadata(
    "Order Details",
    "View the status, items, and delivery details of your order."
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  prefetch(trpc.order.getByOrderId.queryOptions({ orderId: slug }));

  return (
    <HydrateClient>
      <QueryBoundary>
        <Suspense fallback={<OrderDetailsSkeleton />}>
          <OrderDetailsPage slug={slug} />
        </Suspense>
      </QueryBoundary>
    </HydrateClient>
  );
}
