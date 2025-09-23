import { Suspense } from "react";
import { StoreReturnsManagement } from "@/modules/store/returns/StoreReturnsManagement";

interface StoreReturnsPageProps {
  params: Promise<{ store_id: string }>;
}

export default async function StoreReturnsPage({
  params,
}: StoreReturnsPageProps) {
  const { store_id } = await params;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Returns Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage customer return requests for your store
          </p>
        </div>

        <Suspense fallback={<div>Loading returns...</div>}>
          <StoreReturnsManagement storeId={store_id} />
        </Suspense>
      </div>
    </div>
  );
}
