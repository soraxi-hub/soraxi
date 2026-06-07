"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { useRouter } from "next/navigation";
import { useCart } from "./use-cart-hook";
import { useAuth } from "./use-auth-hook";

type Output = inferProcedureOutput<AppRouter["home"]["getPublicProductBySlug"]>;
type Product = Output["product"];

interface UseProductInfoReturn {
  isCopied: boolean;
  userId: string | null;
  isInWishlist: boolean;
  handleWishlistToggle: (product: Product) => Promise<void>;
  handleAddToCart: (product: Product, size?: string) => Promise<void>;
  handleShareProduct: () => void;
}

export function useProductInfo(product: Product): UseProductInfoReturn {
  const { userId } = useAuth();
  const trpc = useTRPC();
  const [isCopied, setIsCopied] = useState(false);
  const { addItem } = useCart(userId);
  const router = useRouter();

  function redirectToLogin(
    router: ReturnType<typeof useRouter>,
    redirect: string,
  ) {
    router.push(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
  }

  // Fetch user's wishlist
  const { data: wishlist, refetch: refetchWishlist } = useQuery(
    trpc.wishlist.getUnPopulatedWishlistByUserId.queryOptions(),
  );

  // Check if product is in wishlist
  const isInWishlist = useMemo(() => {
    if (!product || !wishlist?.products) return false;
    return wishlist.products.some(
      (item) => item.productId.toString() === product.productId,
    );
  }, [wishlist, product?.productId ?? ""]);

  // Wishlist mutations
  const addToWishlist = useMutation(
    trpc.wishlist.addItem.mutationOptions({
      onSuccess: () => {
        toast.success(
          `${product?.name ?? "Unknown Product"} added to wishlist`,
        );
        refetchWishlist();
      },
      onError: () => {
        toast.error(
          `Error adding ${product?.name ?? "Unknown Product"} to wishlist`,
        );
      },
    }),
  );

  const removeFromWishlist = useMutation(
    trpc.wishlist.removeItem.mutationOptions({
      onSuccess: () => {
        toast.success(
          `${product?.name ?? "Unknown Product"} removed from wishlist`,
        );
        refetchWishlist();
      },
      onError: (error) => {
        toast.error(
          error.message ||
            `Error removing ${product?.name ?? "Unknown Product"} from wishlist`,
        );
      },
    }),
  );

  // Handlers
  const handleWishlistToggle = async (product: Product) => {
    if (!product) {
      toast.info("Product data is unavailable.");
      return;
    }

    if (!userId) {
      toast.error("Please login to continue.", {
        action: {
          label: "Login",
          onClick: () => redirectToLogin(router, `/products/${product.slug}`),
        },
        actionButtonStyle: {
          backgroundColor: "#14a800",
          color: "white",
        },
      });
      return;
    }

    if (isInWishlist) {
      removeFromWishlist.mutate({ productId: product.productId });
    } else {
      addToWishlist.mutate({
        productId: product.productId,
        productType: product.productType,
      });
    }
  };

  const handleAddToCart = async (product: Product) => {
    if (!product) {
      toast.info("Product data is unavailable.");
      return;
    }

    await addItem({
      productId: product.productId,
      storeId: product.storeId,
      productType: product.productType,
      quantity: 1,
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
