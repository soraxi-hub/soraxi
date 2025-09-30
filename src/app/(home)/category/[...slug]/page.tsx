"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CategoryHeader } from "@/modules/category/CategoryHeader";
import { ProductFilters } from "@/modules/category/ProductFilters";
import { ProductGrid } from "@/modules/category/ProductGrid";
import { ProductSort } from "@/modules/category/ProductSort";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { categories } from "@/constants/constant";
import { useTRPC } from "@/trpc/client";
import { useQueryState } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import ClientMetadata from "@/components/client-meta-data";

interface FilterOptions {
  priceRange: [number, number];
  inStock: boolean;
  ratings: number[];
}

export default function CategoryPage() {
  const params = useParams();
  const slugs = params.slug as string[];

  const [sortBy, setSortBy] = useState<
    "newest" | "price-asc" | "price-desc" | "rating-desc" | undefined
  >("newest");
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 1000000],
    inStock: false,
    ratings: [],
  });

  const [categorySlug, subcategorySlug] = slugs;
  const trpc = useTRPC();
  const [search] = useQueryState("search");

  // Data fetching with tRPC and React Query
  const {
    data: publicProductsData,
    isLoading: productsLoading,
    refetch: fetchProducts,
  } = useQuery(
    trpc.home.getPublicProducts.queryOptions({
      category: categorySlug !== "all" ? categorySlug : undefined,
      subCategory: subcategorySlug || undefined,
      verified: true,
      search,
      sort: sortBy,
      priceMin: filters.priceRange[0],
      priceMax: filters.priceRange[1],
      ratings: filters.ratings.length > 0 ? filters.ratings : undefined,
    })
  );

  const products = publicProductsData?.products || [];

  // Find category and subcategory info
  const category = categories.find((cat) => cat.slug === categorySlug);
  const subcategory = category?.subcategories.find(
    (sub) => sub.slug === subcategorySlug
  );

  useEffect(() => {
    fetchProducts();
  }, [categorySlug, subcategorySlug, sortBy, filters]);

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground">
            The category you`&#39;`re looking for doesn`&#39;`t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ClientMetadata
        title={`Results for "${search}" - Soraxi`}
        description={`Explore products related to "${search}" in ${
          category?.name ?? "our catalog"
        }.`}
      />

      <div className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Header */}
          <CategoryHeader
            categoryName={category.name}
            subcategoryName={subcategory?.name}
            productCount={products.length}
            categorySlug={categorySlug}
          />

          <div className="flex gap-8">
            {/* Desktop Filters Sidebar */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <ProductFilters
                filters={filters}
                onFiltersChangeAction={setFilters}
                maxPrice={1000000}
              />
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-6">
              {/* Sort and View Controls */}
              <div className="flex items-center justify-between w-full space-x-6">
                <ProductSort
                  sortBy={sortBy}
                  onSortChangeAction={setSortBy}
                  totalProducts={products.length}
                />

                {/* Mobile Filter Button */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-4">
                    <ProductFilters
                      filters={filters}
                      onFiltersChangeAction={setFilters}
                      maxPrice={1000000}
                    />
                  </SheetContent>
                </Sheet>
              </div>

              {/* Products Grid */}
              <ProductGrid products={products} loading={productsLoading} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
