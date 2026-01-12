"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

import { Card, CardContent } from "@/components/ui/card";
import { Search, Award, Zap, Shield, Truck } from "lucide-react";

import { ProductCard } from "../products/product-detail/product-card";
import { useQueryState } from "nuqs";
import { HomeHero } from "./home-page-banner";

/**
 * HomePage Component
 */
export function HomePage() {
  const trpc = useTRPC();
  const [search] = useQueryState("search");

  // Data fetching with tRPC and React Query
  const { data: publicProductsData, isLoading: productsLoading } = useQuery(
    trpc.home.getPublicProducts.queryOptions({
      verified: true,
      search,
      page: 1,
      limit: 50,
    })
  );

  const allProducts = publicProductsData?.products || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {!search && <HomeHero />}

      {/* Feature Section */}
      {!search && (
        <section className="py-16 bg-muted/30">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[Shield, Truck, Award, Zap].map((Icon, i) => (
                <div className="space-y-4" key={i}>
                  <div className="w-16 h-16 bg-soraxi-green/10 rounded-full flex items-center justify-center mx-auto">
                    <Icon className="w-8 h-8 text-soraxi-green" />
                  </div>
                  <h3 className="font-semibold text-lg">
                    {
                      [
                        // "Verified Sellers",
                        "Trusted Brands",
                        "Fast Delivery",
                        "Quality Guaranteed",
                        "24/7 Support",
                      ][i]
                    }
                  </h3>
                  <p className="text-muted-foreground">
                    {
                      [
                        // "All our sellers are verified and trusted",
                        "All our brands are vetted for quality",
                        "Quick and reliable shipping within Campus",
                        "Premium products with quality assurance",
                        "Round-the-clock customer support",
                      ][i]
                    }
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Product Filters */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-foreground">All Products</h2>
          </div>

          {/* Product Grid or Loader */}
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="animate-pulse p-0">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-6 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div
                className={`grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`}
              >
                {allProducts.map((product) => (
                  <Link key={product.id} href={`/products/${product.slug}`}>
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
              <h3 className="text-xl font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
