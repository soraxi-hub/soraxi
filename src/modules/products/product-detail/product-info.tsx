"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Star, Shield, RotateCcw } from "lucide-react";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { formatNaira } from "@/lib/utils/naira";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useEffect, useMemo, useState } from "react";
import { useCartStore } from "@/modules/store/cart-store";

type Output = inferProcedureOutput<AppRouter["home"]["getPublicProductBySlug"]>;
type Product = Output["product"];

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const trpc = useTRPC();
  const [isCopied, setIsCopied] = useState(false);

  // State for current logged-in user ID (fetched once on component mount)
  // You may want to manage user state globally in a real app
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    getUserFromCookie().then((user) => setUserId(user?.id ?? null));
  }, []);

  // Fetch user's wishlist from backend using TRPC query
  const { data: wishlist, refetch: refetchWishlist } = useQuery(
    trpc.wishlist.getUnPopulatedWishlistByUserId.queryOptions()
  );

  // Helper: check if current product is already in user's wishlist
  const isInWishlist = useMemo(() => {
    if (!product || !wishlist?.products) return false;
    return wishlist.products.some(
      (item) => item.productId.toString() === product!.id
    );
  }, [wishlist, product?.id]);

  // React Query mutation to add an item to wishlist
  const addToWishlist = useMutation(
    trpc.wishlist.addItem.mutationOptions({
      // On success: show toast and refresh wishlist query for up-to-date data
      onSuccess: () => {
        toast.success(
          `${product?.name ?? "Unknown Product"} added to wishlist`
        );
        refetchWishlist();
      },
      onError: () => {
        toast.error(
          `Error adding ${product?.name ?? "Unknown Product"} to wishlist`
        );
      },
    })
  );

  // React Query mutation to remove an item from wishlist
  const removeFromWishlist = useMutation(
    trpc.wishlist.removeItem.mutationOptions({
      // On success: show toast and refresh wishlist query for up-to-date data
      onSuccess: () => {
        toast.success(
          `${product?.name ?? "Unknown Product"} removed from wishlist`
        );
        refetchWishlist();
      },
      onError: (error) => {
        toast.error(
          error.message ||
            `Error removing ${product?.name ?? "Unknown Product"} from wishlist`
        );
      },
    })
  );

  // React Query mutation to add item to cart (unchanged)
  const addToCart = useMutation(
    trpc.cart.addItem.mutationOptions({
      onSuccess: (_, variables) => {
        // console.log("variables", variables);
        // Update Zustand cart immediately
        useCartStore.getState().addItem({
          productId: variables.productId,
          quantity: variables.quantity,
          size: variables.selectedSize?.size,
        });

        toast.success(`${product?.name ?? "Unknown Product"} added to cart`);
      },
      onError: (error) => {
        toast.error(
          error.message ||
            `Error adding ${product?.name ?? "Unknown Product"} to cart`
        );
      },
    })
  );

  if (!product) {
    return null;
  }

  // Handler for wishlist button click
  const handleWishlistToggle = async (product: Product) => {
    if (!userId) {
      toast.error("Please Login to perform this action.");
      return;
    }

    if (!product) {
      toast.info("Product data is unavailable.");
      return;
    }

    if (isInWishlist) {
      // If already in wishlist, remove it
      removeFromWishlist.mutate({
        productId: product.id,
      });
    } else {
      // Otherwise, add it
      addToWishlist.mutate({
        productId: product.id,
        productType: product.productType,
      });
    }
  };

  // Handler for adding to cart (unchanged)
  const handleAddToCart = async (product: Product, size?: string) => {
    if (!product) {
      toast.info("Product data is unavailable.");
      return;
    }

    if (!userId) {
      toast.error("Please Login to perform this action.");
      return;
    }
    const selectedSizeData = product.sizes?.find((s) => s.size === size);

    addToCart.mutate({
      productId: product.id,
      storeId: product.storeId,
      quantity: 1,
      productType: product.productType,
      selectedSize: selectedSizeData
        ? {
            size: selectedSizeData.size,
            price: selectedSizeData.price,
            quantity: selectedSizeData.quantity,
          }
        : undefined,
    });
  };

  const handleShareProduct = () => {
    const productUrl = `${window.location.origin}/products/${product.slug}`;
    navigator.clipboard.writeText(productUrl);
    setIsCopied(true);
    toast.success(`Product slug copied to clipboard!`);

    setTimeout(() => setIsCopied(false), 2000);
  };

  const hasVariants = product.sizes && product.sizes.length > 0;
  const basePrice = hasVariants
    ? Math.min(...product.sizes!.map((s) => s.price))
    : product.price;
  const maxPrice = hasVariants
    ? Math.max(...product.sizes!.map((s) => s.price))
    : product.price;

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
          {hasVariants && basePrice !== maxPrice ? (
            <span>
              {formatNaira(basePrice!)} - {formatNaira(maxPrice!)}
            </span>
          ) : (
            formatNaira(basePrice!)
          )}
        </div>
        {hasVariants && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Price varies by size
          </p>
        )}
      </div>

      <Separator />

      {/* Size Selection (if applicable) */}
      {hasVariants && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Available Sizes</h3>
          <div className="grid grid-cols-2 gap-3">
            {product.sizes!.map((sizeOption, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{sizeOption.size}</div>
                      <div className="text-sm text-gray-600">
                        {formatNaira(sizeOption.price)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {sizeOption.quantity > 0 ? (
                          <span className="text-soraxi-green">
                            {sizeOption.quantity} in stock
                          </span>
                        ) : (
                          <span className="text-red-600">Out of stock</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stock Info for non-variant products */}
      {!hasVariants && product.productQuantity && (
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
      )}

      <Separator />

      {/* Add to Cart and Wishlist Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          className="w-full col-span-2 bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          disabled={!hasVariants ? product.productQuantity === 0 : false}
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
