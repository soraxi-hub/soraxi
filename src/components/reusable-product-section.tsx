"use client";

import { useRef } from "react";
import { ProductCard } from "@/modules/products/product-detail/product-card";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import ProductLoadingSkeleton from "@/modules/skeletons/product-loading-skeleton";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Output = inferProcedureOutput<AppRouter["home"]["getPublicProducts"]>;
type Products = Output["products"];

function ReusableProductSection({
  sectionTitle,
  sectionDescription,
  display,
  loading,
  products,
  showSeeMore = false,
  seeMoreHref = "/",
}: {
  sectionTitle: string;
  sectionDescription: string;
  loading: boolean;
  display: "horizontal" | "vertical";
  showSeeMore: boolean;
  products: Products;
  seeMoreHref?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll the container horizontally
   */
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;

    const scrollAmount = 320; // width of card + gap

    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-foreground">{sectionTitle}</h2>
          <div className="max-w-xl text-muted-foreground">
            <p>{sectionDescription}</p>
          </div>
        </div>

        {loading ? (
          <ProductLoadingSkeleton />
        ) : display === "vertical" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <ProductCard product={product} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Horizontal Scroll Container */}
            <div
              ref={scrollRef}
              className="flex overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide scroll-smooth"
            >
              <div className="flex gap-6 min-w-max">
                {products.map((product) => (
                  <div key={product.id} className="w-[280px] flex-shrink-0">
                    <Link href={`/products/${product.slug}`}>
                      <ProductCard product={product} />
                    </Link>
                  </div>
                ))}

                {showSeeMore && (
                  <div className="w-[280px] flex-shrink-0">
                    <Link href={seeMoreHref}>
                      <div className="h-full border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center p-8 hover:border-primary/50 hover:bg-primary/5 transition-colors group">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <ArrowRight className="w-6 h-6 text-primary" />
                          </div>

                          <div className="text-center">
                            <h3 className="font-semibold text-lg mb-2">
                              See More
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Explore all products
                            </p>
                          </div>

                          <Button variant="outline" size="sm" className="mt-2">
                            View All
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Left Arrow */}
            {showSeeMore && (
              <button
                onClick={() => scroll("left")}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-soraxi-green hover:bg-soraxi-green-hover shadow-md rounded-full p-2 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right Arrow */}
            {showSeeMore && (
              <button
                onClick={() => scroll("right")}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-soraxi-green hover:bg-soraxi-green-hover shadow-md rounded-full p-2 cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default ReusableProductSection;
