"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/modules/products/product-detail/product-card";
import ProductLoadingSkeleton from "@/modules/skeletons/product-loading-skeleton";
import { useTRPC } from "@/trpc/client";

import { SectionHeading } from "./section-heading";

/** Four across on desktop is two full rows — enough to browse, not a catalogue. */
const FEED_SIZE = 6;

/**
 * The main product band on the home page.
 *
 * Draws a random sample rather than the newest products, so a repeat visitor
 * meets different stock instead of the same eight items until someone uploads.
 * The shuffle happens server-side via `$sample` and is cached for the same 60
 * seconds as everything else on this page — so it changes roughly once a
 * minute, the same for everyone, rather than per request. Reshuffling per
 * visitor would mean an uncached aggregation on every home page view.
 *
 * Reuses `ProductCard` unchanged: it already renders the verified badge,
 * rating, price and category chip exactly as designed, and it is the same card
 * used on category and search results, so a product looks identical wherever a
 * shopper meets it.
 */
export function TrendingOnCampus() {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.home.getRandomProducts.queryOptions({ size: FEED_SIZE }),
  );

  const products = data?.products ?? [];

  // Renders nothing when there is nothing to show. An empty band under a
  // confident heading reads as a broken page.
  if (!isLoading && products.length === 0) return null;

  return (
    <section className={cn("py-12")}>
      <div className={cn("mx-auto max-w-7xl px-6")}>
        <SectionHeading
          title="Trending on campus"
          /*
           * Not "what students bought this week" — this is a random sample of
           * verified stock, with no purchase or recency signal behind it.
           * Claiming sales data we do not compute would be inventing analytics
           * for shoppers.
           */
          subtitle="A fresh pick from verified vendors, updated through the day"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/products">View all</Link>
            </Button>
          }
        />

        {isLoading ? (
          <ProductLoadingSkeleton />
        ) : (
          <div
            className={cn(
              "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
            )}
          >
            {products.map((product) => (
              <Link key={product.productId} href={`/products/${product.slug}`}>
                <ProductCard product={product} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
