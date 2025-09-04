"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/modules/store/cart-store";
import { CartItem } from "@/modules/cart/CartItem";
import { CartSummary } from "@/modules/cart/CartSummary";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

/**
 * Type definitions for cart items and order summary
 *
 * These types ensure consistency between server and client components
 * and provide proper TypeScript validation.
 */
interface CartItemType {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  inStock: boolean;
  maxQuantity: number;
}

interface OrderSummary {
  subtotal: number;
  // shipping: number;
  // tax: number;
  // discount: number;
  total: number;
  itemCount: number;
}

interface CartPageClientProps {
  /** Pre-loaded cart items from server-side rendering */
  initialCartItems: CartItemType[];
  /** Pre-calculated order summary from server */
  initialOrderSummary: OrderSummary;
  /** Authenticated user ID */
  userId: string;
}

/**
 * Client-Side Cart Page Component
 *
 * Handles all interactive functionality for the cart page:
 * - Cart item quantity updates
 * - Item removal
 * - Checkout process
 * - Optimistic UI updates
 * - Server synchronization
 *
 * This component receives pre-loaded data from the server component,
 * eliminating loading states and hydration mismatches.
 *
 * @param initialCartItems - Cart items pre-loaded from server
 * @param initialOrderSummary - Order totals pre-calculated on server
 * @param userId - Authenticated user identifier
 */
export function CartPageClient({
  initialCartItems,
  initialOrderSummary,
  userId,
}: CartPageClientProps) {
  // Initialize client state with server-provided data
  const [cartItems, setCartItems] = useState<CartItemType[]>(initialCartItems);
  const [orderSummary, setOrderSummary] =
    useState<OrderSummary>(initialOrderSummary);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // tRPC and React Query setup
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const router = useRouter();

  // Zustand store for global cart state management
  const { updateQuantity, removeItem } = useCartStore();

  /**
   * Utility function to recalculate order totals
   *
   * Keeps the client-side totals in sync when cart items change.
   * This provides immediate feedback while server updates are in progress.
   *
   * @param items - Current cart items array
   * @returns Calculated order summary
   */
  const recalculateOrderSummary = (items: CartItemType[]): OrderSummary => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    // const shipping = subtotal >= 50000 ? 0 : 5000;
    // const tax = Math.round(subtotal * 0.075);
    // const discount = 0;
    // const total = subtotal + shipping + tax - discount;
    const total = subtotal;

    return {
      subtotal,
      // shipping,
      // tax,
      // discount,
      total,
      itemCount: items.length,
    };
  };

  /**
   * Server mutation for updating cart item quantities
   *
   * Uses tRPC for type-safe server communication.
   * Includes error handling and cache invalidation.
   */
  const updateQuantityMutation = useMutation({
    ...trpc.cart.updateQuantity.mutationOptions(),
    onError: (error) => {
      console.error("Failed to update quantity on server:", error);
      toast.error("Failed to update cart. Please try again.");
    },
    onSuccess: () => {
      // Invalidate relevant queries to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: trpc.cart.getByUserId.queryKey({ userId }),
      });
    },
  });

  /**
   * Server mutation for removing cart items
   *
   * Handles item removal with proper error handling and optimistic updates.
   */
  const removeItemMutation = useMutation({
    ...trpc.cart.updateQuantity.mutationOptions(),
    onError: (error) => {
      console.error("Failed to remove item from server:", error);
      toast.error("Failed to remove item. Please try again.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.cart.getByUserId.queryKey({ userId }),
      });
      router.refresh();
    },
  });

  /**
   * Handle cart item quantity updates
   *
   * Implements optimistic UI updates for better user experience:
   * 1. Immediately update local state
   * 2. Update Zustand store for global state consistency
   * 3. Send update to server
   * 4. Handle errors gracefully with rollback capability
   *
   * @param productId - Product identifier
   * @param newQuantity - New quantity value
   * @param size - Optional size variant
   */
  const handleUpdateQuantity = async (
    productId: string,
    newQuantity: number,
    size?: string
  ) => {
    // Find the item being updated
    const itemIndex = cartItems.findIndex(
      (item) => item.productId === productId && item.size === size
    );

    if (itemIndex === -1) {
      toast.error("Item not found in cart");
      return;
    }

    const currentItem = cartItems[itemIndex];

    // Validate quantity bounds
    if (newQuantity < 1 || newQuantity > currentItem.maxQuantity) {
      toast.error(`Quantity must be between 1 and ${currentItem.maxQuantity}`);
      return;
    }

    // Store original state for potential rollback
    const originalItems = [...cartItems];
    const originalSummary = { ...orderSummary };

    // Optimistic UI update
    const updatedItems = [...cartItems];
    updatedItems[itemIndex] = { ...currentItem, quantity: newQuantity };
    setCartItems(updatedItems);
    setOrderSummary(recalculateOrderSummary(updatedItems));

    // Update Zustand store for global state consistency
    updateQuantity(productId, newQuantity, size);

    try {
      // Sync with server
      await updateQuantityMutation.mutateAsync({
        userId,
        productId,
        quantity: newQuantity,
        size,
      });

      toast.success("Cart updated successfully");
    } catch (error) {
      // Rollback optimistic update on error
      setCartItems(originalItems);
      setOrderSummary(originalSummary);

      // Note: You may want to implement Zustand store rollback here
      // depending on your store's architecture
      console.error("Failed to update cart:", error);
    }
  };

  /**
   * Handle cart item removal
   *
   * Implements optimistic removal with server synchronization:
   * 1. Immediately remove from local state
   * 2. Update Zustand store
   * 3. Send removal request to server
   * 4. Handle errors with rollback
   *
   * @param productId - Product identifier
   * @param size - Optional size variant
   */
  const handleRemoveItem = async (productId: string, size?: string) => {
    // Find item to remove
    const itemToRemove = cartItems.find(
      (item) => item.productId === productId && item.size === size
    );

    if (!itemToRemove) {
      toast.error("Item not found in cart");
      return;
    }

    // Store original state for potential rollback
    const originalItems = [...cartItems];
    const originalSummary = { ...orderSummary };

    // Optimistic UI update
    const updatedItems = cartItems.filter(
      (item) => !(item.productId === productId && item.size === size)
    );
    setCartItems(updatedItems);
    setOrderSummary(recalculateOrderSummary(updatedItems));

    // Update Zustand store
    removeItem(productId, size);

    try {
      // Server synchronization (set quantity to 0 to remove)
      await removeItemMutation.mutateAsync({
        userId,
        productId,
        quantity: 0,
        size,
      });

      toast.success("Item removed from cart");
    } catch (error) {
      // Rollback on error
      setCartItems(originalItems);
      setOrderSummary(originalSummary);

      console.error("Failed to remove item:", error);
    }
  };

  /**
   * Handle wishlist functionality
   *
   * Placeholder for future wishlist implementation.
   * Currently shows a mock success message.
   *
   * @param productId - Product identifier
   */
  const handleMoveToWishlist = (productId: string) => {
    console.log("Moved to wishlist (feature coming soon)", productId);
    toast.success("Moved to wishlist (feature coming soon)");
    // Future implementation:
    // 1. Add to wishlist
    // 2. Remove from cart
    // 3. Update UI accordingly
  };

  /**
   * Handle checkout process
   *
   * Initiates the checkout flow with proper loading states
   * and error handling.
   */
  const handleCheckout = async () => {
    setIsCheckingOut(true);

    try {
      // Validate cart before checkout
      if (cartItems.length === 0) {
        toast.error("Your cart is empty");
        return;
      }

      // Check for out-of-stock items
      const outOfStockItems = cartItems.filter((item) => !item.inStock);
      if (outOfStockItems.length > 0) {
        toast.error("Some items in your cart are out of stock");
        return;
      }

      toast.success("Redirecting to checkout...");

      router.push("/checkout");
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Checkout failed. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Cart Items Section */}
      <div className="lg:col-span-2">
        <div className="bg-card rounded-lg border p-6 space-y-0">
          {cartItems.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantityAction={(productId, quantity) =>
                handleUpdateQuantity(productId, quantity, item.size)
              }
              onRemoveItemAction={() =>
                handleRemoveItem(item.productId, item.size)
              }
              onMoveToWishlistAction={() =>
                handleMoveToWishlist(item.productId)
              }
            />
          ))}
        </div>
      </div>

      {/* Order Summary Section */}
      <div className="lg:col-span-1 sticky top-8">
        <CartSummary
          subtotal={orderSummary.subtotal}
          // shipping={orderSummary.shipping}
          // tax={orderSummary.tax}
          // discount={orderSummary.discount}
          total={orderSummary.total}
          itemCount={orderSummary.itemCount}
          onCheckoutAction={handleCheckout}
          isCheckingOut={isCheckingOut}
        />
      </div>
    </div>
  );
}
