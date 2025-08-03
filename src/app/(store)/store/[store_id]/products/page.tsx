import { StoreProductsManagementSkeleton } from "@/modules/skeletons/store-products-management-skeleton";
import { StoreProductsManagement } from "@/modules/store/store-products";
import { Suspense } from "react";

async function Page(props: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await props.params;
  return (
    <Suspense fallback={<StoreProductsManagementSkeleton />}>
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <StoreProductsManagement store_id={store_id} />
        </div>
      </div>
    </Suspense>
  );
}

export default Page;
