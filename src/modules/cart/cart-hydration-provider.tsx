"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "../store/cart-store";
import { useTRPC } from "@/trpc/client";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { useQuery } from "@tanstack/react-query";

/**
 * CartHydration Component
 *
 * Responsible for hydrating the client-side cart store with user's cart data from the server.
 * This component handles the complex flow of:
 * 1. Authenticating the user via cookie validation
 * 2. Fetching cart data from the server using tRPC
 * 3. Transforming and storing the data in the client-side Zustand store
 *
 * Key architectural decisions:
 * - Uses conditional fetching to avoid unnecessary API calls
 * - Separates user authentication from data fetching for better error handling
 * - Implements proper React Query patterns to avoid hook rule violations
 *
 * @returns null - This is a data-only component with no UI
 */
export function CartHydration() {
  // Zustand store setter for updating cart state
  const setCart = useCartStore((s) => s.setCart);
  const resetCart = useCartStore((s) => s.resetCart);

  // tRPC client instance for type-safe API calls
  const trpc = useTRPC();

  // Local state to manage user authentication status
  const [userId, setUserId] = useState<string | null>(null);

  // Flag to control when React Query should execute the cart fetch
  // This prevents the query from running before we have a valid user ID
  const [shouldFetch, setShouldFetch] = useState(false);

  /**
   * Authentication Effect
   *
   * Handles user authentication on component mount.
   * Uses an IIFE (Immediately Invoked Function Expression) to handle async operations
   * within useEffect, which doesn't directly support async functions.
   *
   * This pattern prevents the common mistake of making useEffect itself async,
   * which would return a Promise instead of a cleanup function.
   */
  useEffect(() => {
    (async () => {
      try {
        // Validate user session from HTTP-only cookie
        const user = await getUserFromCookie();

        if (user) {
          // Set user ID and enable cart fetching
          setUserId(user.id);
          setShouldFetch(true);
        }
        // If no user, component remains in unauthenticated state
      } catch (error) {
        // Log authentication errors but don't throw
        // This prevents the entire component tree from crashing
        console.error("Failed to authenticate user for cart hydration:", error);
      }
    })();
  }, []); // Empty dependency array - only run on mount

  /**
   * Cart Data Fetching with React Query
   *
   * Uses React Query's useQuery hook at the component's top level to comply with Rules of Hooks.
   * The query is conditionally enabled to prevent execution before authentication.
   *
   * Benefits of this approach:
   * - Automatic caching and background refetching
   * - Built-in loading and error states
   * - Deduplication of identical requests
   * - Optimistic updates support
   */
  const { data: cart, error } = useQuery({
    // Spread tRPC query options for type safety and consistency
    ...trpc.cart.getByUserId.queryOptions(),

    // Conditional execution: only fetch when we have a valid user ID
    // The non-null assertion (!) is safe here because enabled ensures userId exists
    enabled: shouldFetch && !!userId,

    // Optional: Add stale time to reduce unnecessary refetches
    staleTime: 5 * 60 * 1000, // 5 minutes

    // Optional: Cache time for offline scenarios
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  /**
   * Cart Data Processing Effect
   *
   * Transforms server cart data into the format expected by the client store.
   * This separation of concerns allows for:
   * - Different data structures between server and client
   * - Data validation and sanitization
   * - Graceful handling of malformed data
   */
  useEffect(() => {
    // Early return if no cart data available
    if (!cart) return;

    console.log("CartHydration: Processing cart data...");

    try {
      /**
       * Transform server cart items to client store format
       *
       * Server format: { product: ObjectId, quantity: number, selectedSize: { size: string } }
       * Client format: { productId: string, quantity: number, size?: string }
       *
       * This transformation layer provides flexibility for:
       * - API changes without breaking the client
       * - Different data requirements between server and client
       * - Type safety and validation
       */
      const items = cart.items.map((item) => ({
        // Convert MongoDB ObjectId to string for client compatibility
        productId: item.productId.toString(),

        // Preserve quantity as-is
        quantity: item.quantity,

        // Optional chaining for size to handle missing selectedSize
        size: item.selectedSize?.size,
      }));

      // Reset the cart by making it empty to remove deleted products that may still be in the cart. The update the cart.
      resetCart();

      // Update the Zustand store with transformed data
      setCart(items);

      console.log(`CartHydration: Successfully hydrated ${items.length} items`);
    } catch (transformError) {
      // Handle data transformation errors gracefully
      console.error(
        "CartHydration: Failed to transform cart data:",
        transformError
      );

      // Optional: Set empty cart on transformation failure
      // setCart([])
    }
  }, [cart, setCart]); // Re-run when cart data or setCart function changes

  /**
   * Error Handling Effect
   *
   * Centralized error handling for cart fetching failures.
   * Separated from the data processing effect for cleaner error boundaries.
   */
  useEffect(() => {
    if (error) {
      console.error("CartHydration: Failed to fetch cart data:", error);

      // Optional: Implement error reporting service integration
      // errorReportingService.captureException(error, {
      //   context: 'cart-hydration',
      //   userId: userId
      // })

      // Optional: Show user-friendly error notification
      // toast.error("Failed to load your cart. Please refresh the page.")
    }
  }, [error]); // Only re-run when error state changes

  // This component is purely for data management - no UI rendering
  return null;
}
