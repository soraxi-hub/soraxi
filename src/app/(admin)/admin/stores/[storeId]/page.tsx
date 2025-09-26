import { caller } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { serializeData } from "@/lib/utils";
import {
  AdminAction,
  StoreAdminDashboard,
} from "@/modules/admin/stores/store-admin-dashboard";
import { StoreProfileSkeleton } from "@/modules/skeletons/store-profile-skeleton";

async function Page(props: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await props.params;
  const rawStoreData = await caller.adminStore.getStoreProfileAdminView({
    storeId,
  });
  const storeData = serializeData(rawStoreData);

  const handleStoreAction = async (storeId: string, action: AdminAction) => {
    "use server";

    try {
      await caller.adminStore.storeActionForAdmins({
        storeId,
        action: action,
      });
    } catch (error) {
      throw new Error(`Failed to execute action: ${error}`);
    }
  };

  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<StoreProfileSkeleton />}>
        <StoreAdminDashboard
          storeData={storeData}
          onAction={handleStoreAction}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

export default Page;
