"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Star, Shield, RotateCcw } from "lucide-react";
import { useProductInfo } from "@/hooks/use-product-info";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import Link from "next/link";

type Output = inferProcedureOutput<AppRouter["home"]["getPublicProductBySlug"]>;
type Product = Output["product"];

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const {
    isCopied,
    isInWishlist,
    handleWishlistToggle,
    handleAddToCart,
    handleShareProduct,
  } = useProductInfo(product);

  if (!product) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Product Title and Rating */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {product.name}
        </h1>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(product.rating ?? 0)
                    ? "text-yellow-400 fill-current"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            ({product.rating ? product.rating.toFixed(1) : 0} reviews)
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="space-y-2">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {product.formattedPrice}
        </div>
      </div>

      <Separator />

      {/* Stock Info for non-variant products */}
      {product.productQuantity && (
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                product.productQuantity > 0 ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm">
              {product.productQuantity > 0
                ? `${product.productQuantity} in stock`
                : "Out of stock"}
            </span>
          </div>
          <div>
            <Link
              className="hover:underline hover:text-soraxi-green-hover text-sm"
              href={`/brand/${product.storeId}`}
            >
              Visit Store
            </Link>
          </div>
        </div>
      )}

      <Separator />

      {/* Add to Cart and Wishlist Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          className="w-full col-span-2 bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          disabled={product.productQuantity === 0}
          onClick={() => handleAddToCart(product)}
        >
          Add to Cart
        </Button>

        <Button
          size="lg"
          className="w-full bg-blue-500 hover:bg-blue-500/85 text-white"
          onClick={() => handleWishlistToggle(product)}
        >
          {isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
        </Button>

        <Button
          size="lg"
          className="w-full bg-yellow-500 text-white hover:bg-yellow-500/85"
          onClick={handleShareProduct}
        >
          {isCopied ? "Copied!" : "Share Product"}
        </Button>
      </div>

      <Separator />

      {/* Product Features */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Shield className="w-4 h-4 text-soraxi-green" />
          <span>Secure payment & buyer protection</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <RotateCcw className="w-4 h-4  text-soraxi-green" />
          <span>7-day return policy</span>
        </div>
      </div>
    </div>
  );
}
