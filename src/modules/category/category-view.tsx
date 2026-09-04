"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTRPC } from "@/trpc/client";
import { ProductFilters } from "@/modules/category/ProductFilters";
import { ProductGrid } from "@/modules/category/ProductGrid";
import { ProductSort } from "@/modules/category/ProductSort";
import { CategoryPagination } from "@/modules/category/category-pagination";
import {
  buildCategoryProductsInput,
  categorySearchParams,
  MAX_PRICE,
  type CategorySearchParams,
  type SortOption,
} from "@/modules/category/category-search-params";

interface CategoryViewProps {
  categorySlug: string;
  subcategorySlug?: string;
  /** Canonical path of this category, used to build pager hrefs. */
  basePath: string;
}

export function CategoryView({
  categorySlug,
  subcategorySlug,
  basePath,
}: CategoryViewProps) {
  const trpc = useTRPC();
  const [params, setParams] = useQueryStates(categorySearchParams);

  const input = buildCategoryProductsInput({
    categorySlug,
    subcategorySlug,
    params: params as CategorySearchParams,
  });

  // Prefetched on the server, so this resolves from the hydrated cache on the
  // first render and only hits the network when a param actually changes.
  const { data, isFetching } = useQuery(
    trpc.home.getPublicProducts.queryOptions(input)
  );

  const products = data?.products ?? [];
  const pagination = data?.pagination;

  // ProductFilters owns a debounced local copy, so this must be referentially
  // stable or its debounce is rebuilt on every render.
  const filters = useMemo(
    () => ({
      priceRange: [params.minPrice, params.maxPrice] as [number, number],
      inStock: params.inStock,
      ratings: params.ratings,
    }),
    [params.minPrice, params.maxPrice, params.inStock, params.ratings]
  );

  // Any change to what is being filtered invalidates the current page number:
  // page 4 of the old result set is rarely page 4 of the new one.
  const handleFiltersChange = useCallback(
    (next: typeof filters) => {
      void setParams({
        minPrice: next.priceRange[0],
        maxPrice: next.priceRange[1],
        inStock: next.inStock,
        ratings: next.ratings,
        page: 1,
      });
    },
    [setParams]
  );

  const handleSortChange = useCallback(
    (sort: SortOption) => {
      void setParams({ sort, page: 1 });
    },
    [setParams]
  );

  return (
    <div className="flex gap-8">
      {/* Desktop Filters Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <ProductFilters
          filters={filters}
          onFiltersChangeAction={handleFiltersChange}
          maxPrice={MAX_PRICE}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between w-full space-x-6">
          <ProductSort
            sortBy={params.sort}
            onSortChangeAction={handleSortChange}
            totalProducts={pagination?.total ?? 0}
          />

          {/* Mobile Filter Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-4 overflow-y-auto">
              <ProductFilters
                filters={filters}
                onFiltersChangeAction={handleFiltersChange}
                maxPrice={MAX_PRICE}
              />
            </SheetContent>
          </Sheet>
        </div>

        <ProductGrid products={products} loading={isFetching} />

        {pagination && pagination.totalPages > 1 && (
          <CategoryPagination
            basePath={basePath}
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            params={params as CategorySearchParams}
          />
        )}
      </div>
    </div>
  );
}
