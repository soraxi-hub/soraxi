import { StoreProductsManagementSkeleton } from "@/modules/skeletons/store-products-management-skeleton";
import { StoreProductsManagement } from "@/modules/store/store-products";
import { Suspense } from "react";
import type { Metadata } from "next";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Product Management",
    "Manage products for your store. Add new items, update details, track inventory, and keep your storefront up to date with ease."
  );
}

async function Page(props: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await props.params;
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<StoreProductsManagementSkeleton />}>
        <div className="min-h-screen bg-background py-8">
          <div className="container mx-auto px-4">
            <StoreProductsManagement store_id={store_id} />
          </div>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}

export default Page;
