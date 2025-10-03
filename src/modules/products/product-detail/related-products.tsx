"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { formatNaira } from "@/lib/utils/naira";
import { siteConfig } from "@/config/site";

type RelatedProductsOutput = inferProcedureOutput<
  AppRouter["home"]["getRelatedProducts"]
>;
type RelatedProduct = RelatedProductsOutput;

interface RelatedProductsProps {
  products: RelatedProduct;
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  const relatedProducts = products.slice(0, 4);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Related Products</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product) => {
          const hasVariants = product.sizes && product.sizes.length > 0;
          const displayPrice = hasVariants
            ? Math.min(...product.sizes!.map((s) => s.price))
            : product.price;

          return (
            <Link key={product.id} href={`/products/${product.slug}`}>
              <Card className="group cursor-pointer hover:shadow-lg transition-shadow p-0">
                <CardContent className="p-0">
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    <Image
                      src={
                        (product.images && product.images[0]) ||
                        siteConfig.placeHolderImg1
                      }
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.isVerifiedProduct && (
                      <Badge className="absolute top-2 left-2 bg-green-100 text-green-800">
                        Verified
                      </Badge>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-1">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i <
                              Math.floor(product.rating ? product.rating : 0)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-600">
                        ({product.rating ? product.rating.toFixed(1) : 0})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">
                        {hasVariants ? "From " : ""}
                        {formatNaira(displayPrice!)}
                      </span>
                      {product.category && (
                        <Badge variant="outline" className="text-xs">
                          {product.category[0]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
