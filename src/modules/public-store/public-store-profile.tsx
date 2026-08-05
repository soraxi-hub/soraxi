"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { StoreAboutCard } from "./components/store-about-card";
import { StoreBreadcrumb } from "./components/store-breadcrumb";
import { StoreIdentityCard } from "./components/store-identity-card";
import { StoreProductsPanel } from "./components/store-products-panel";
import { StoreStatusBanner } from "./components/store-status-banner";

interface PublicStoreProfileProps {
  storeId: string;
}

/**
 * Public storefront at `/brand/[storeId]`.
 *
 * All four states — active, empty, pending and suspended — share this one
 * shell; the state resolved on the server decides whether a status banner
 * appears and whether the products panel lists a catalogue or explains its
 * absence. The URL never changes, because visitors arrive here from shared
 * links and search results whatever has since happened to the store.
 *
 * Layout is mobile-first: a single column that reads store → products → about,
 * becoming a sticky identity sidebar beside the catalogue from `lg` up.
 */
export function PublicStoreProfile({ storeId }: PublicStoreProfileProps) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.publicStore.getStoreProfilePublic.queryOptions({ storeId }),
  );

  const { store, products, viewState } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <StoreBreadcrumb storeName={store.storeName} />

        <StoreStatusBanner state={viewState} />

        {/*
          DOM order is identity → products → about, which is the reading order
          we want on a phone: who this is, then the catalogue they came for,
          then the blurb. At `lg` the grid re-places about into the second row
          of the left column and lets the products panel span both rows, so the
          description sits under the identity card as designed — without
          rendering the description twice.
        */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-8">
          <div className="lg:col-start-1 lg:row-start-1">
            <StoreIdentityCard store={store} />
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <StoreProductsPanel products={products} state={viewState} />
          </div>

          <div className="lg:col-start-1 lg:row-start-2">
            <StoreAboutCard description={store.description} />
          </div>
        </div>
      </div>
    </div>
  );
}
