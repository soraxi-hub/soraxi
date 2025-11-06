"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

import { Card, CardContent } from "@/components/ui/card";
import { Search, Award, Zap, Shield, Truck } from "lucide-react";

import { ProductCard } from "../products/product-detail/product-card";
import { useQueryState } from "nuqs";
import { motion } from "framer-motion";

/**
 * HomePage Component
 * Updated to use cursor-based pagination with infinite scroll
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
      {!search && (
        <section className="relative bg-gradient-to-r from-soraxi-green to-soraxi-green/80 text-white py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <motion.h1
                  className="text-5xl font-bold leading-tight"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  Discover Amazing Products from Verified Stores
                </motion.h1>

                <motion.p
                  className="text-xl opacity-90"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                >
                  Shop with confidence from our curated marketplace of trusted
                  sellers offering quality products at great prices.
                </motion.p>
              </div>
            </div>
          </div>
        </section>
      )}

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
                        "Verified Sellers",
                        "Fast Delivery",
                        "Quality Guaranteed",
                        "24/7 Support",
                      ][i]
                    }
                  </h3>
                  <p className="text-muted-foreground">
                    {
                      [
                        "All our sellers are verified and trusted",
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

      {/* Featured Products */}
      {/* <section className="py-16">
        <div className="mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Featured Products
              </h2>
              <p className="text-muted-foreground mt-2">
                Handpicked products from our top-rated sellers
              </p>
            </div>
            <Button variant="outline">
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {(featuredProducts || []).map((product) => (
                <CarouselItem
                  key={product.id}
                  className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <Link href={`/products/${product.slug}`}>
                    <ProductCard
                      product={{
                        ...product,
                        price: product.price ?? 0,
                      }}
                    />
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section> */}

      {/* Categories */}
      {/* <section className="py-16 bg-muted/30">
        <div className="mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Shop by Category
          </h2>
          <p className="text-muted-foreground mb-8">
            Explore our wide range of product categories
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {(categories || []).map((category) => (
              <Card
                key={category.name}
                className="group hover:shadow-lg cursor-pointer"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-soraxi-green/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-soraxi-green/20">
                    <span className="text-2xl">{category.icon}</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {category.count} products
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section> */}

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
