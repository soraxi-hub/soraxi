"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { parseAsInteger, parseAsStringEnum, useQueryState } from "nuqs";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ProductGrid } from "@/modules/category/ProductGrid";
import { ProductSort } from "@/modules/category/ProductSort";
import { useTRPC } from "@/trpc/client";

import {
  AllProductsFiltersPanel,
  DEFAULT_FILTERS,
  MAX_PRICE_NAIRA,
  type AllProductsFilters,
} from "./all-products-filters";
import { ProductsPagination } from "./products-pagination";

const PAGE_SIZE = 12;

const SORT_VALUES = [
  "newest",
  "price-asc",
  "price-desc",
  "rating-desc",
] as const;

/**
 * The whole catalogue, filterable, at `/products`.
 *
 * Mirrors the category page's layout and reuses its `ProductGrid` and
 * `ProductSort` so a product looks and sorts identically wherever it is met.
 * The one structural difference is that category is a filter here rather than a
 * property of the route.
 *
 * `search`, `sort` and `page` live in the URL: a search result is the single
 * most likely thing on this page to be shared or reloaded, and losing it on a
 * refresh is the difference between a link that works and one that dumps
 * someone at an unfiltered catalogue. The remaining filters are local state —
 * they are refinements, not destinations.
 */
export function AllProductsPage() {
  const trpc = useTRPC();

  const [search] = useQueryState("search");
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [sort, setSort] = useQueryState(
    "sort",
    parseAsStringEnum([...SORT_VALUES]).withDefault("newest"),
  );

  const [filters, setFilters] = useState<AllProductsFilters>(DEFAULT_FILTERS);

  const { data, isLoading } = useQuery(
    trpc.home.getPublicProducts.queryOptions({
      page,
      limit: PAGE_SIZE,
      verified: true,
      search: search || undefined,
      sort,
      categories:
        filters.categories.length > 0 ? filters.categories : undefined,
      inStock: filters.inStock || undefined,
      // Sending the ceiling would filter on it needlessly; undefined means
      // "no upper bound" rather than "capped at the slider maximum".
      priceMax:
        filters.maxPrice < MAX_PRICE_NAIRA ? filters.maxPrice : undefined,
    }),
  );

  const products = data?.products ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  /*
   * Narrowing the results while on a later page can leave you past the end,
   * staring at an empty grid with no indication why. Snap back to page one
   * whenever the filters, sort or query change.
   */
  const filterSignature = useMemo(
    () =>
      JSON.stringify([
        filters.categories,
        filters.maxPrice,
        filters.inStock,
        sort,
        search,
      ]),
    [filters, sort, search],
  );

  useEffect(() => {
    setPage(1);
    // Reacting to the signature, not to `setPage`, which is stable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSignature]);

  const heading = search ? `Results for “${search}”` : "All products";

  return (
    <div className={cn("container mx-auto px-6 py-8")}>
      <div className={cn("space-y-6")}>
        <div>
          <h1 className={cn("text-2xl font-bold tracking-tight sm:text-3xl")}>
            {heading}
          </h1>
          <p className={cn("mt-1 text-sm text-muted-foreground")}>
            {isLoading
              ? "Loading products…"
              : total === 0
                ? "No products match these filters"
                : `Showing ${products.length} of ${total} ${
                    total === 1 ? "item" : "items"
                  } from verified vendors`}
          </p>
        </div>

        <div className={cn("flex gap-8")}>
          <div className={cn("hidden w-64 flex-shrink-0 lg:block")}>
            <AllProductsFiltersPanel
              filters={filters}
              onFiltersChangeAction={setFilters}
            />
          </div>

          <div className={cn("min-w-0 flex-1 space-y-6")}>
            <div
              className={cn("flex w-full items-center justify-between gap-4")}
            >
              <ProductSort
                sortBy={sort}
                onSortChangeAction={setSort}
                totalProducts={total}
              />

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("lg:hidden")}
                  >
                    <Filter className={cn("mr-2 h-4 w-4")} />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side={`right`} className={cn("w-80 p-4")}>
                  <AllProductsFiltersPanel
                    filters={filters}
                    onFiltersChangeAction={setFilters}
                  />
                </SheetContent>
              </Sheet>
            </div>

            <ProductGrid products={products} loading={isLoading} />

            {!isLoading && (
              <ProductsPagination
                page={page}
                totalPages={totalPages}
                onPageChangeAction={setPage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
