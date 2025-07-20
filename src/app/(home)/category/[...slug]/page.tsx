"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CategoryHeader } from "@/modules/category/CategoryHeader";
import { ProductFilters } from "@/modules/category/ProductFilters";
import { ProductGrid } from "@/modules/category/ProductGrid";
import { ProductSort } from "@/modules/category/ProductSort";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import { categories } from "@/constants/constant";

interface FilterOptions {
  priceRange: [number, number];
  inStock: boolean;
  ratings: number[];
  brands: string[];
}

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slugs = params.slug as string[];

  console.log("searchParams", searchParams);

  const [categorySlug, subcategorySlug] = slugs;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 1000000],
    inStock: false,
    ratings: [],
    brands: [],
  });

  // Find category and subcategory info
  const category = categories.find((cat) => cat.slug === categorySlug);
  const subcategory = category?.subcategories.find(
    (sub) => sub.slug === subcategorySlug
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        category: categorySlug,
        ...(subcategorySlug && { subcategory: subcategorySlug }),
        sort: sortBy,
        priceMin: filters.priceRange[0].toString(),
        priceMax: filters.priceRange[1].toString(),
        inStock: filters.inStock.toString(),
        ratings: filters.ratings.join(","),
        brands: filters.brands.join(","),
      });

      const response = await fetch(`/api/products/category?${queryParams}`);
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categorySlug, subcategorySlug, sortBy, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // useEffect(() => {
  //   fetchProducts();
  // }, [categorySlug, subcategorySlug, sortBy, filters]);

  // const fetchProducts = async () => {
  //   setLoading(true);
  //   try {
  //     const queryParams = new URLSearchParams({
  //       category: categorySlug,
  //       ...(subcategorySlug && { subcategory: subcategorySlug }),
  //       sort: sortBy,
  //       priceMin: filters.priceRange[0].toString(),
  //       priceMax: filters.priceRange[1].toString(),
  //       inStock: filters.inStock.toString(),
  //       ratings: filters.ratings.join(","),
  //       brands: filters.brands.join(","),
  //     });

  //     const response = await fetch(`/api/products/category?${queryParams}`);
  //     const data = await response.json();
  //     setProducts(data.products || []);
  //   } catch (error) {
  //     console.error("Error fetching products:", error);
  //     setProducts([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
          <p className="text-muted-foreground">
            The category you`&apos;`re looking for doesn`&apos;`t exist.
          </p>
        </div>
      </div>
    );
  }

  const availableBrands = ["Apple", "Samsung", "Nike", "Adidas", "Sony"]; // This would come from API

  return (
    <div className="container mx-auto px-4 py-8">
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
              onFiltersChange={setFilters}
              availableBrands={availableBrands}
              maxPrice={1000000}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Sort and View Controls */}
            <div className="flex items-center justify-between">
              <ProductSort
                sortBy={sortBy}
                onSortChange={setSortBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
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
                <SheetContent side="left" className="w-80">
                  <ProductFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    availableBrands={availableBrands}
                    maxPrice={1000000}
                  />
                </SheetContent>
              </Sheet>
            </div>

            {/* Products Grid */}
            <ProductGrid products={products} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
