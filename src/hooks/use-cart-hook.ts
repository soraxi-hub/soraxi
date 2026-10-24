"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useCartStore } from "@/modules/store/cart-store";
import { useRouter, usePathname } from "next/navigation";
import { ProductTypeEnum } from "@/enums";
import { IPopulatedCartInfo } from "@/domain/cart/cart-interface";

// `userId` is no longer a parameter — the server resolves the logged-in
// user's cart or, for a logged-out visitor, their guest cart via the
// guest-id cookie, so every mutation works the same way regardless of
// auth state.
export function useCart() {
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
    onError: (err) => {
      if (err.data?.code === "UNAUTHORIZED") return redirectToLogin();
      toast.error(err.message || "Failed to add item");
    },
  });

  const updateQuantityMutation = useMutation({
    ...trpc.cart.updateQuantity.mutationOptions(),
    onSuccess: () => {
      toast.success("Cart updated");
      invalidateCart();
    },
    onError: (err) => {
      if (err.data?.code === "UNAUTHORIZED") return redirectToLogin();
      toast.error("Update failed. Reverting...");
      router.refresh(); // Simple way to rollback to server state
    },
  });

  // Facade Methods
  // Guests are handled server-side via the guest-id cookie, so these no
  // longer gate on `userId` — only genuinely logged-out-and-no-guest-cookie
  // requests fall back to the login prompt, which the mutation's own
  // UNAUTHORIZED error surfaces through onError.
  const addItem = async (params: {
    productId: string;
    storeId: string;
    productType: ProductTypeEnum;
    quantity: number;
  }) => {
    return addItemMutation.mutateAsync({
      ...params,
    });
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) return removeItem(productId);

    // Optimistic Update for Zustand
    syncZustandUpdate(productId, quantity);
    return updateQuantityMutation.mutateAsync({ productId, quantity });
  };

  const removeItem = async (productId: string) => {
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
