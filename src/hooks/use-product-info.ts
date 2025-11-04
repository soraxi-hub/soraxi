"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useCartStore } from "@/modules/store/cart-store";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Output = inferProcedureOutput<AppRouter["home"]["getPublicProductBySlug"]>;
type Product = Output["product"];

interface UseProductInfoReturn {
  // State
  isCopied: boolean;
  userId: string | null;
  isInWishlist: boolean;

  // Actions
  handleWishlistToggle: (product: Product) => Promise<void>;
  handleAddToCart: (product: Product, size?: string) => Promise<void>;
  handleShareProduct: () => void;
}

export function useProductInfo(product: Product): UseProductInfoReturn {
  const trpc = useTRPC();
  const [isCopied, setIsCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user ID on component mount
  useEffect(() => {
    getUserFromCookie().then((user) => setUserId(user?.id ?? null));
  }, []);

  // Fetch user's wishlist
  const { data: wishlist, refetch: refetchWishlist } = useQuery(
    trpc.wishlist.getUnPopulatedWishlistByUserId.queryOptions()
  );

  // Check if product is in wishlist
  const isInWishlist = useMemo(() => {
    if (!product || !wishlist?.products) return false;
    return wishlist.products.some(
      (item) => item.productId.toString() === product!.id
    );
  }, [wishlist, product?.id]);

  // Wishlist mutations
  const addToWishlist = useMutation(
    trpc.wishlist.addItem.mutationOptions({
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

  const removeFromWishlist = useMutation(
    trpc.wishlist.removeItem.mutationOptions({
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

  // Cart mutation
  const addToCart = useMutation(
    trpc.cart.addItem.mutationOptions({
      onSuccess: (_, variables) => {
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

  // Handlers
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
      removeFromWishlist.mutate({ productId: product.id });
    } else {
      addToWishlist.mutate({
        productId: product.id,
        productType: product.productType,
      });
    }
  };

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
    if (!product) {
      toast.info("Product data is unavailable.");
      return;
    }

    const productUrl = `${window.location.origin}/products/${product.slug}`;
    navigator.clipboard.writeText(productUrl);
    setIsCopied(true);
    toast.success(`Product slug copied to clipboard!`);

    setTimeout(() => setIsCopied(false), 2000);
  };

  return {
    isCopied,
    userId,
    isInWishlist,
    handleWishlistToggle,
    handleAddToCart,
    handleShareProduct,
  };
}
