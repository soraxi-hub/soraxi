"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PackageSearch, Search } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicToJSON } from "@/domain/products/product-interface";
import { ProductCard } from "@/modules/products/product-detail/product-card";
import { stateExposesProducts, type StoreViewState } from "../store-view-state";

interface StoreProductsPanelProps {
  products: PublicToJSON[];
  state: StoreViewState;
}

type SortOption = "newest" | "price-asc" | "price-desc" | "rating-desc";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  "rating-desc": "Top rated",
};

/**
 * What the panel says when there is nothing to list, per state.
 *
 * `empty` frames it as the vendor still setting up. `pending`/`suspended` say
 * nothing about the catalogue's size — the store may well have products, and
 * the count is not the visitor's business while it's withheld.
 */
const EMPTY_COPY: Record<
  Exclude<StoreViewState, "active">,
  { title: string; body: string }
> = {
  empty: {
    title: "No products yet",
    body: "This store is still setting up their product catalog.",
  },
  pending: {
    title: "Nothing to show yet",
    body: "Check back once this store is live.",
  },
  suspended: {
    title: "Nothing to show yet",
    body: "Check back once this store is live.",
  },
};

/**
 * The storefront's product listing, with in-store search and sort.
 *
 * Filtering happens client-side over the products already in the payload: a
 * single store's catalogue arrives in one request, so a round trip per
 * keystroke would buy nothing. If catalogues grow past a few hundred items this
 * should move behind a paginated procedure.
 */
export function StoreProductsPanel({
  products,
  state,
}: StoreProductsPanelProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const catalogueVisible = stateExposesProducts(state);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = query
      ? products.filter((product) =>
          product.name.toLowerCase().includes(query),
        )
      : products;

    // `products` arrives newest-first from the server and carries no date
    // field, so "newest" is the incoming order. Copy before sorting so the
    // prop array is never mutated.
    if (sort === "newest") return filtered;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "rating-desc":
          return b.rating - a.rating;
        default:
          return 0;
      }
    });
  }, [products, search, sort]);

  // `active` never reaches the empty branch (it implies at least one product),
  // but the lookup still has to be total for the type to check out.
  const emptyCopy = EMPTY_COPY[state === "active" ? "empty" : state];

  const itemCountLabel = catalogueVisible
    ? `${visibleProducts.length} ${visibleProducts.length === 1 ? "item" : "items"}`
    : "Unavailable right now";

  return (
    <section className="space-y-6">
      {/* Heading + controls: stacked on mobile, heading-left/controls-right at sm */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold sm:text-3xl">Products</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {itemCountLabel}
          </p>
        </div>

        {catalogueVisible && products.length > 0 && (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-56">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search this store..."
                aria-label="Search this store"
                className="pl-9"
              />
            </div>

            <Select
              value={sort}
              onValueChange={(value) => setSort(value as SortOption)}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Sort products">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                  <SelectItem key={option} value={option}>
                    {SORT_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!catalogueVisible || products.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageSearch aria-hidden />
            </EmptyMedia>
            <EmptyTitle>{emptyCopy.title}</EmptyTitle>
            <EmptyDescription>{emptyCopy.body}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : visibleProducts.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No matching products</EmptyTitle>
            <EmptyDescription>
              Nothing in this store matches &ldquo;{search.trim()}&rdquo;. Try a
              different search.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <Link
              key={product.productId}
              href={`/products/${product.slug}`}
              className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-soraxi-green"
            >
              <ProductCard product={product} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
