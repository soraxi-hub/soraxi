"use client";

import Link from "next/link";
import { Heart, Plus, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProductCard } from "../products/product-detail/product-card";

export function Wishlist() {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const trpc = useTRPC();

  const { data: wishlist, refetch } = useSuspenseQuery(
    trpc.wishlist.getByUserId.queryOptions()
  );
  const { products } = wishlist;

  // React Query mutation to remove an item from wishlist
  const removeFromWishlist = useMutation(
    trpc.wishlist.removeItem.mutationOptions({
      // On success: show toast and refresh wishlist query for up-to-date data
      onSuccess: () => {
        toast.success(`Product removed from wishlist`);
        refetch();
      },
      onError: () => {
        toast.error(`Error removing Product from wishlist`);
      },
    })
  );

  const handleRemove = async (productId: string) => {
    setRemovingId(productId);

    removeFromWishlist.mutate({
      productId,
    });
  };

  return (
    <main className="py-8">
      {/* Wishlist Header */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {/* <Heart className="w-6 h-6" /> */}
            My Wishlist
          </h1>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
            {products.length} Items
          </Badge>
        </div>

        {/* Wishlist Products */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:col-span-3">
            {products.map((product) => {
              return (
                <div key={product.productId.id} className="relative group">
                  <Button
                    onClick={() => handleRemove(product.productId.id)}
                    disabled={removingId === product.productId.id}
                    className="absolute top-2 right-2 z-10 p-2 bg-background rounded-full shadow-sm hover:bg-red-100 transition-colors"
                    aria-label="Remove from wishlist"
                    size={`icon`}
                  >
                    {removingId === product.productId.id ? (
                      <Heart className="w-6 h-6 fill-red-500 text-red-500 animate-pulse" />
                    ) : (
                      <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                    )}
                  </Button>

                  <Link
                    href={`/products/${product.productId.slug}`}
                    className="text-sm space-y-1"
                  >
                    <ProductCard product={product.productId} />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed shadow-xs h-[300px] border-udua-orange-primary/30">
            <div className="flex flex-col items-center gap-1 text-center p-8">
              <XCircle className="h-10 w-10 text-udua-orange-primary" />
              <h3 className="mt-4 text-lg font-semibold">No products added</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                Add products to your wishlist
              </p>
              <Link href="/">
                <Button
                  size="sm"
                  className="bg-soraxi-green hover:bg-soraxi-darkmode-success/85"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
