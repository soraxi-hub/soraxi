"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

import { Search } from "lucide-react";

import { ProductCard } from "../products/product-detail/product-card";
import { useQueryState } from "nuqs";
import { HomeHero } from "./home-page-banner";
import ProductLoadingSkeleton from "../skeletons/product-loading-skeleton";

import { HowBuyingWorks } from "./sections/how-buying-works";
import { ShopByCategory } from "./sections/shop-by-category";
import { TrendingOnCampus } from "./sections/trending-on-campus";
import { VendorCta } from "./sections/vendor-cta";
import { WhySoraxi } from "./sections/why-soraxi";

/**
 * HomePage Component
 *
 * Two mutually exclusive views behind one route: the landing page when there is
 * no `search`, and the results grid when there is. `useQueryState` keeps that in
 * the URL, so a search stays shareable and survives a refresh.
 */
export function HomePage() {
  const trpc = useTRPC();
  const [search] = useQueryState("search");

  // Data fetching with tRPC and React Query
  const { data: publicProductsData, isLoading: productsLoading } = useQuery(
    trpc.home.getPublicProducts.queryOptions({
      verified: true,
      search: search || undefined,
      page: 1,
      limit: 50,
    }),
  );

  const allProducts = publicProductsData?.products || [];
  const groupedProducts = publicProductsData?.groupedProducts || {};

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {!search && <HomeHero products={groupedProducts["general"] || []} />}

      {/*
        Landing sections. All of them hide while a search is active so the
        results grid below is the only thing on screen — a shopper who has
        typed a query is not browsing any more.
      */}
      {!search && (
        <>
          <ShopByCategory />

          {/*
            Fetches its own randomised feed rather than being handed the page
            query's results — see the note in the component. The old section
            read from the "general" field bucket, so a band titled "Trending on
            campus" rendered empty whenever stock sat under any other field.
          */}
          <TrendingOnCampus />

          <WhySoraxi />
          <HowBuyingWorks />
          <VendorCta />
        </>
      )}

      {/* Product Filters */}
      {search && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-foreground">
                All Products
              </h2>
            </div>

            {/* Product Grid or Loader */}
            {productsLoading ? (
              <ProductLoadingSkeleton />
            ) : (
              <>
                <div
                  className={`grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`}
                >
                  {allProducts.map((product) => (
                    <Link
                      key={product.productId}
                      href={`/products/${product.slug}`}
                    >
                      <ProductCard product={product} />
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Empty State */}
            {allProducts.length === 0 && !productsLoading && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-soraxi-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-12 h-12 text-soraxi-green" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  No products found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
