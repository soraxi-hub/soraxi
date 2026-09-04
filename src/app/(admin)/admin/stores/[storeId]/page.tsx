import type { Metadata } from "next";
import { caller } from "@/trpc/server";
import { Suspense } from "react";
import { serializeData } from "@/lib/utils";
import StoreAdminDashboard, {
  AdminAction,
} from "@/modules/admin/stores/store-admin-dashboard";
import { StoreProfileSkeleton } from "@/modules/skeletons/store-profile-skeleton";

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

export const metadata: Metadata = {
  title: "Store Details",
  description: "Full store profile with admin moderation actions.",
};

async function Page(props: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await props.params;

  return (
    <Suspense fallback={<StoreProfileSkeleton />}>
      <StoreAdminContent storeId={storeId} />
    </Suspense>
  );
}

export default Page;
