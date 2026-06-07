"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CartItem } from "@/modules/cart/cart-item";
import { CartSummary } from "@/modules/cart/cart-summary";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { IPopulatedCartInfo } from "@/domain/cart/cart-interface";
import { useAuth } from "@/hooks/use-auth-hook";
import { useCart } from "@/hooks/use-cart-hook";
import { EmptyCart } from "./empty-cart";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ShoppingBag } from "lucide-react";

interface OrderSummary {
  subtotal: number;
  total: number;
  itemCount: number;
}

interface CartPageClientProps {
  /** Pre-loaded cart items from server-side rendering */
  initialCartItems: IPopulatedCartInfo["items"];
  /** Pre-calculated order summary from server */
  initialOrderSummary: OrderSummary;
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
}: CartPageClientProps) {
  const { userId } = useAuth();
  const { updateQuantity, removeItem, recalculateOrderSummary } =
    useCart(userId);
  const [cartItems, setCartItems] =
    useState<IPopulatedCartInfo["items"]>(initialCartItems);
  const [orderSummary, setOrderSummary] =
    useState<OrderSummary>(initialOrderSummary);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const trpc = useTRPC();
  const router = useRouter();

  /**
   * Server mutation for adding idempotency key to cart
   *
   * Handles idempotency key addition with proper error handling.
   */
  const addIdempotencyKeyToCart = useMutation({
    ...trpc.cart.addIdempotencyKey.mutationOptions(),
    onError: (error) => {
      console.error("Failed to add idempotency key:", error);
      toast.error("Failed to add idempotency key. Please try again.");
    },
    onSuccess: () => {
      console.log("Idempotency key added successfully");
      // toast.success("Idempotency key added successfully");
    },
  });

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyCart />
      </div>
    );
  }

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
  ) => {
    // Find the item being updated
    const itemIndex = cartItems.findIndex(
      (item) => item.product.productId === productId,
    );

    if (itemIndex === -1) {
      toast.error("Item not found in cart");
      return;
    }

    const currentItem = cartItems[itemIndex];

    // Validate quantity bounds
    if (newQuantity < 1 || newQuantity > currentItem.product.productQuantity) {
      toast.error(
        `Quantity must be between 1 and ${currentItem.product.productQuantity}`,
      );
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

    try {
      await updateQuantity(productId, newQuantity);
    } catch (error) {
      // Rollback optimistic update on error
      setCartItems(originalItems);
      setOrderSummary(originalSummary);
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
  const handleRemoveItem = async (productId: string) => {
    // Find item to remove
    const itemToRemove = cartItems.find(
      (item) => item.product.productId === productId,
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
      (item) => !(item.product.productId === productId),
    );
    setCartItems(updatedItems);
    setOrderSummary(recalculateOrderSummary(updatedItems));

    // Update Zustand store

    try {
      await removeItem(productId);
    } catch (error) {
      // Rollback on error
      setCartItems(originalItems);
      setOrderSummary(originalSummary);

      console.error("Failed to remove item:", error);
    }
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
      const outOfStockItems = cartItems.filter((item) => !item.product.inStock);
      if (outOfStockItems.length > 0) {
        toast.error("Some items in your cart are out of stock");
        return;
      }

      // Add idempotency key to cart to prevent duplicate orders
      await addIdempotencyKeyToCart.mutateAsync();

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
    <div className="container mx-auto px-4 py-4">
      {/* Page Header with Breadcrumb */}
      <div className="flex items-center justify-between mb-8">
        <Breadcrumb className="hidden md:inline-flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Shopping Cart</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <span className="text-muted-foreground">
            ({cartItems.length} item
            {cartItems.length > 1 ? "s" : ""})
          </span>
        </div>
      </div>

      {/* Pass pre-loaded data to client component */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">
        {/* Cart Items Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent>
              {cartItems.map((item) => (
                <CartItem
                  key={item.product.productId}
                  item={item}
                  onUpdateQuantityAction={(productId, quantity) =>
                    handleUpdateQuantity(productId, quantity)
                  }
                  onRemoveItemAction={() =>
                    handleRemoveItem(item.product.productId)
                  }
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Section */}
        <div className="lg:col-span-1 sticky top-8">
          <CartSummary
            subtotal={orderSummary.subtotal}
            total={orderSummary.total}
            itemCount={orderSummary.itemCount}
            onCheckoutAction={handleCheckout}
            isCheckingOut={isCheckingOut}
          />
        </div>
      </div>
    </div>
  );
}
