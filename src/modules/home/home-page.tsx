"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

import { Search, Award, Zap, Shield, Truck } from "lucide-react";

import { ProductCard } from "../products/product-detail/product-card";
import { useQueryState } from "nuqs";
import { HomeHero } from "./home-page-banner";
import LawProductSection from "./popular-fields/law";
import ProductLoadingSkeleton from "../skeletons/product-loading-skeleton";
import GeneralProductSection from "./popular-fields/general";
import EngineeringProductSection from "./popular-fields/engineering";
import AccountingProductSection from "./popular-fields/accounting-finance";
import MedicineProductSection from "./popular-fields/medicine";
import ComputerScienceProductSection from "./popular-fields/computer-science-it";
import DemandListingSection from "../requests/components/home-page-demand-section";

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
      search: search || undefined,
      page: 1,
      limit: 50,
    }),
  );

  const { data: demandListing, isLoading: listingsLoading } = useQuery(
    trpc.demandListing.getAllRequests.queryOptions({ limit: 12 }),
  );

  const allProducts = publicProductsData?.products || [];
  const groupedProducts = publicProductsData?.groupedProducts || {};
  const listings = demandListing?.requests || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {!search && <HomeHero products={groupedProducts["general"] || []} />}

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

      {/* General Products Section */}
      {!search && (
        <GeneralProductSection
          products={groupedProducts["general"] || []}
          isLoading={productsLoading}
        />
      )}

      {/* General Products Section */}
      {!search && (
        <DemandListingSection demands={listings} isLoading={listingsLoading} />
      )}

      {/* Law Products Section */}
      {!search && (
        <LawProductSection
          products={groupedProducts["law"] || []}
          isLoading={productsLoading}
        />
      )}

      {/* Engineering Products Section */}
      {!search && (
        <EngineeringProductSection
          products={groupedProducts["engineering"] || []}
          isLoading={productsLoading}
        />
      )}

      {/* Accounting Products Section */}
      {!search && (
        <AccountingProductSection
          products={groupedProducts["accounting-finance"] || []}
          isLoading={productsLoading}
        />
      )}

      {/* Medical Products Section */}
      {!search && (
        <MedicineProductSection
          products={groupedProducts["medicine-health-sciences"] || []}
          isLoading={productsLoading}
        />
      )}

      {/* Computer Science Products Section */}
      {!search && (
        <ComputerScienceProductSection
          products={groupedProducts["computer-science-it"] || []}
          isLoading={productsLoading}
        />
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
