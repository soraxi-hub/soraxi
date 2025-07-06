"use client";

import { useEffect } from "react";
import { useCartStore } from "../store/cart-store";

/**
 * Type definitions for cart data structure
 *
 * Defines the shape of cart items as expected by the client store.
 * This provides type safety and documentation for the data structure.
 */
interface CartItem {
  /** Unique identifier for the product */
  productId: string;
  /** Number of items in the cart */
  quantity: number;
  /** Optional size selection (for clothing, shoes, etc.) */
  size?: string;
}

/**
 * Props interface for the CartHydrationClient component
 */
interface CartHydrationClientProps {
  /**
   * Pre-loaded cart data from server-side rendering
   * null indicates no cart data available (unauthenticated user or error)
   */
  initialCart: CartItem[] | null;
}

/**
 * Client-Side Cart Hydration Component
 *
 * Companion component to the server-side CartProvider.
 * Handles the client-side hydration of cart data that was
 * pre-loaded on the server.
 *
 * This pattern provides the benefits of server-side rendering
 * while maintaining the reactivity of client-side state management.
 *
 * @param initialCart - Pre-loaded cart data from server
 * @returns null - This is a data-only component
 */
export function CartHydrationClient({ initialCart }: CartHydrationClientProps) {
  // Access the Zustand store setter for cart updates
  const setCart = useCartStore((s) => s.setCart);

  /**
   * Hydration Effect
   *
   * Runs once on component mount to hydrate the client store
   * with server-provided data. This ensures the store is populated
   * immediately without additional API calls.
   */
  useEffect(() => {
    // Only proceed if we have cart data to hydrate
    if (initialCart) {
      console.log(
        `CartHydration: Hydrating ${initialCart.length} items from server data`
      );

      // Update the client store with server data
      setCart(initialCart);
    } else {
      // Log when no cart data is available
      // This could be due to unauthenticated user or server error
      console.log("CartHydration: No initial cart data available");
    }
  }, [initialCart, setCart]); // Dependencies ensure effect runs when props change

  // No UI rendering - this is purely for data management
  return null;
}
