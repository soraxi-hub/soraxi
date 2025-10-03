"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ProductCard } from "../products/product-detail/product-card";
import { ShoppingCartIcon } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price?: number;
  images?: string[];
  category?: string[];
  rating?: number;
  slug: string;
  isVerifiedProduct?: boolean;
}

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden p-0">
            <div className="aspect-square bg-muted animate-pulse" />
            <CardContent className="p-4 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
              <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-soraxi-green/20 rounded-full flex items-center justify-center mb-4">
          <ShoppingCartIcon className="h-8 w-8 text-soraxi-green" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No products found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or search terms
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <Link key={product.id} href={`/products/${product.slug}`}>
          <ProductCard product={product} />
        </Link>
      ))}
    </div>
  );
}
