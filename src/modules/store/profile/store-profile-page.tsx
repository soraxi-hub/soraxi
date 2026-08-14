"use client";

import { useState } from "react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  SoraxiTabs,
  SoraxiTabsContent,
  SoraxiTabsList,
  SoraxiTabsTrigger,
} from "@/components/ui/soraxi-tab";
import { StoreFactory } from "@/domain/stores/store-factory";
import { StoreProfileManagerPrivate } from "@/domain/stores/store-profile-manager-private";
import { DateFormatter } from "@/lib/utils/date-formatter";
import { cn, getInitials } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

import {
  pageGutter,
  soraxiTabsTriggerStyle,
} from "../components/page-card.styles";
import { EditFieldDialog } from "./components/edit-field-dialog";
import { OverviewTab } from "./components/overview-tab";
import { ProductsTab } from "./components/products-tab";
import { SettingsTab } from "./components/settings-tab";
import { StoreHeaderCard } from "./components/store-header-card";
import { StoreStatsRow } from "./components/store-stats-row";
import { ownerStatusView } from "./store-status";

/**
 * The vendor's private view of their own store.
 *
 * Composition only — every section is its own component under `./components`.
 * The version this replaced was a single 620-line file with two inline edit
 * forms, which is why the same "is this store live?" logic appeared in three
 * places with three different labels.
 *
 * The page owns the horizontal gutter and the cards render flush inside it on
 * mobile, becoming boxed at `lg`. See `page-card.styles.ts` for why that
 * matters at 375px.
 */
export default function StoreProfilePage() {
  const trpc = useTRPC();
  const { data, refetch } = useSuspenseQuery(
    trpc.storeProfile.getStoreProfilePrivate.queryOptions(),
  );

  const [editing, setEditing] = useState<"name" | "description" | null>(null);

  const { storeDoc, populatedProducts } = data;

  const store = new StoreProfileManagerPrivate(
    StoreFactory.store({
      ...storeDoc,
      storeOwner: storeDoc.storeOwner.toString(),
    }),
    populatedProducts,
  );

  const updateName = useMutation(
    trpc.storeProfile.handleStoreNameUpdate.mutationOptions({
      onSuccess: () => {
        toast.success("Store name updated");
        setEditing(null);
        refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateDescription = useMutation(
    trpc.storeProfile.handleStoreDescriptionUpdate.mutationOptions({
      onSuccess: () => {
        toast.success("Description updated");
        setEditing(null);
        refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const storeData = store.storeData;
  const stats = store.StoreStats;
  const status = ownerStatusView(storeData.status);

  const initials = getInitials(storeData.storeName);

  const publicUrl = `/brand/${storeData.storeId}`;
  const memberSince = DateFormatter.monthYear(
    storeData.createdAt ?? new Date(),
  );

  return (
    <div className={cn("mx-auto w-full max-w-5xl space-y-4 py-6", pageGutter)}>
      {/* <StatusBanner tone={status.tone} /> */}

      <StoreHeaderCard
        storeName={storeData.storeName}
        initials={initials}
        publicUrl={publicUrl}
        status={status}
        onEditName={() => setEditing("name")}
      />

      <StoreStatsRow
        followers={stats.followersCount}
        products={stats.productsCount}
        // Fulfilled-order count is not on this payload yet — see the note in
        // the handover. Falls back to 0 rather than showing a wrong number.
        ordersFulfilled={0}
        memberSince={memberSince}
      />

      <SoraxiTabs defaultValue="overview" className="w-full">
        <SoraxiTabsList className="flex gap-1 bg-muted w-full border-none p-0 rounded-none h-auto">
          <SoraxiTabsTrigger
            className={cn(soraxiTabsTriggerStyle)}
            value="overview"
          >
            Overview
          </SoraxiTabsTrigger>
          <SoraxiTabsTrigger
            className={cn(soraxiTabsTriggerStyle)}
            value="products"
          >
            Products
          </SoraxiTabsTrigger>
          <SoraxiTabsTrigger
            className={cn(soraxiTabsTriggerStyle)}
            value="settings"
          >
            Settings
          </SoraxiTabsTrigger>
        </SoraxiTabsList>

        <SoraxiTabsContent value="overview">
          <OverviewTab
            storeId={storeData.storeId}
            description={storeData.description}
            storeEmail={storeData.email}
            memberSince={memberSince}
            isVerified={storeData.isVerified}
            status={status}
            onEditDescription={() => setEditing("description")}
          />
        </SoraxiTabsContent>

        <SoraxiTabsContent value="products">
          <ProductsTab storeId={storeData.storeId} products={store.products} />
        </SoraxiTabsContent>

        <SoraxiTabsContent value="settings">
          <SettingsTab
            storeName={storeData.storeName}
            storeEmail={storeData.email}
            uniqueId={storeData.uniqueId}
            onEditName={() => setEditing("name")}
          />
        </SoraxiTabsContent>
      </SoraxiTabs>

      <EditFieldDialog
        open={editing === "name"}
        onOpenChange={(open) => setEditing(open ? "name" : null)}
        title="Store name"
        description="This is what students see on your storefront and on every order."
        label="Store name"
        value={storeData.storeName}
        maxLength={100}
        isSaving={updateName.isPending}
        onSave={(name) => updateName.mutate({ name })}
      />

      <EditFieldDialog
        open={editing === "description"}
        onOpenChange={(open) => setEditing(open ? "description" : null)}
        title="What students see"
        description="Tell students what you sell, where you deliver, and anything that helps them trust you."
        label="Description"
        value={storeData.description}
        multiline
        maxLength={1500}
        minLength={100}
        isSaving={updateDescription.isPending}
        onSave={(description) => updateDescription.mutate({ description })}
      />
    </div>
  );
}
