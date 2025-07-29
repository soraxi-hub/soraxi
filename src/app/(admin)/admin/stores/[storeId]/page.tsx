import { caller } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { serializeData } from "@/lib/utils";
import StoreProfileAdminView from "@/modules/admin/stores/store-profile-admin-view";
import { StoreProfileSkeleton } from "@/modules/skeletons/store-profile-skeleton";

async function Page(props: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await props.params;
  const rawStoreData = await caller.adminStore.getStoreProfileAdminView({
    storeId,
  });
  const storeData = serializeData(rawStoreData);

  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<StoreProfileSkeleton />}>
        <StoreProfileAdminView storeData={storeData} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default Page;
