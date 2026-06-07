"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useCartStore } from "@/modules/store/cart-store";
import { useRouter, usePathname } from "next/navigation";
import { ProductTypeEnum } from "@/enums";
import { IPopulatedCartInfo } from "@/domain/cart/cart-interface";

export function useCart(userId: string | null) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const {
    addItem: syncZustandAdd,
    updateQuantity: syncZustandUpdate,
    removeItem: syncZustandRemove,
  } = useCartStore();

  const redirectToLogin = () => {
    toast.error("Please login to continue.", {
      action: {
        label: "Login",
        onClick: () =>
          router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`),
      },
      actionButtonStyle: {
        backgroundColor: "#14a800",
        color: "white",
      },
    });
  };

  // Centralized Mutation Logic
  const invalidateCart = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.cart.getByUserId.queryKey(),
    });
  };

  const addItemMutation = useMutation({
    ...trpc.cart.addItem.mutationOptions(),
    onSuccess: (_, vars) => {
      syncZustandAdd({
        productId: vars.productId,
        quantity: vars.quantity,
        size: vars.selectedSize?.size,
      });
      toast.success("Added to cart");
      invalidateCart();
    },
    onError: (err) => toast.error(err.message || "Failed to add item"),
  });

  const updateQuantityMutation = useMutation({
    ...trpc.cart.updateQuantity.mutationOptions(),
    onSuccess: () => {
      toast.success("Cart updated");
      invalidateCart();
    },
    onError: () => {
      toast.error("Update failed. Reverting...");
      router.refresh(); // Simple way to rollback to server state
    },
  });

  // Facade Methods
  const addItem = async (params: {
    productId: string;
    storeId: string;
    productType: ProductTypeEnum;
    quantity: number;
  }) => {
    if (!userId) return redirectToLogin();
    return addItemMutation.mutateAsync({
      ...params,
    });
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!userId) return redirectToLogin();
    if (quantity <= 0) return removeItem(productId);

    // Optimistic Update for Zustand
    syncZustandUpdate(productId, quantity);
    return updateQuantityMutation.mutateAsync({ productId, quantity });
  };

  const removeItem = async (productId: string) => {
    if (!userId) return redirectToLogin();
    syncZustandRemove(productId);
    return updateQuantityMutation.mutateAsync({ productId, quantity: 0 });
  };

  /**
   * Utility function to recalculate order totals
   *
   * Keeps the client-side totals in sync when cart items change.
   * This provides immediate feedback while server updates are in progress.
   *
   * @param items - Current cart items array
   * @returns Calculated order summary
   */
  const recalculateOrderSummary = (items: IPopulatedCartInfo["items"]) => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
    const total = subtotal;

    return {
      subtotal,
      total,
      itemCount: items.length,
    };
  };

  return {
    addItem,
    removeItem,
    updateQuantity,
    recalculateOrderSummary,
    isPending: addItemMutation.isPending || updateQuantityMutation.isPending,
  };
}
