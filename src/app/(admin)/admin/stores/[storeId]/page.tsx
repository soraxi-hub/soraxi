import { caller } from "@/trpc/server";
import { Suspense } from "react";
import { serializeData } from "@/lib/utils";
import StoreAdminDashboard, {
  AdminAction,
} from "@/modules/admin/stores/store-admin-dashboard";
import { StoreProfileSkeleton } from "@/modules/skeletons/store-profile-skeleton";

/**
 * The fetch lives in this child rather than in `Page` so that `Suspense` has
 * something to suspend on. Awaited one level up, it resolved before `Page`
 * returned any JSX at all — the skeleton could never render, because the
 * boundary meant to show it only existed once the data was already in hand.
 */
async function StoreAdminContent({ storeId }: { storeId: string }) {
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
    <StoreAdminDashboard storeData={storeData} onAction={handleStoreAction} />
  );
}

/*
 * No client `ErrorBoundary` here. `StoreAdminContent` is an async Server
 * Component, and a failed fetch inside it rejects during the server render —
 * before any client boundary exists to catch it. Next.js routes that to
 * `app/(admin)/error.tsx`, which is where this page's error UI comes from.
 */
async function Page(props: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await props.params;

  return (
    <Suspense fallback={<StoreProfileSkeleton />}>
      <StoreAdminContent storeId={storeId} />
    </Suspense>
  );
}

export default Page;
