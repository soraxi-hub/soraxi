import { ErrorFallback } from "@/components/errors/error-fallback";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";
import OrderDetailSkeleton from "@/modules/skeletons/order-detail-skeleton";
import OrderDetailView from "@/modules/store/orders/order-detail-view";
import { Metadata } from "next";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Order Details",
    "View and manage the details of this order, including customer information, items purchased, payment status, and delivery updates."
  );
}

async function Page(props: {
  params: Promise<{ store_id: string; orderId: string }>;
}) {
  const { orderId } = await props.params;
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<OrderDetailSkeleton />}>
        <div className="min-h-screen bg-background py-8">
          <div className="container mx-auto px-4">
            <OrderDetailView orderId={orderId} />
          </div>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}

export default Page;
