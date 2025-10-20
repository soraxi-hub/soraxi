import { ErrorFallback } from "@/components/errors/error-fallback";
import { UserOrdersSkeleton } from "@/modules/skeletons/user-orders-history-skeleton";
import { UserOrders } from "@/modules/user/user-orders";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { Metadata } from "next";
import { generateUserMetadata } from "@/lib/helpers/generate-user-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateUserMetadata(
    "My Orders",
    "View and manage your complete order history. Track delivery status, review past purchases, and access invoice details all in one place."
  );
}

async function Page() {
  prefetch(trpc.order.getByUserId.queryOptions());
  return (
    <HydrateClient>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<UserOrdersSkeleton />}>
          <UserOrders />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}

export default Page;
