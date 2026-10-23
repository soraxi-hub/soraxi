import { CartHydrationClient } from "./cart-hydration-client";
import { caller } from "@/trpc/server";

/**
 * Server-Side Cart Provider Component
 *
 * Alternative implementation that fetches cart data on the server
 * to eliminate hydration mismatches and improve initial page load performance.
 *
 * Benefits of server-side approach:
 * - No hydration mismatches
 * - Faster perceived loading (data available on first render)
 * - Better SEO (cart-dependent content is server-rendered)
 * - Reduced client-side JavaScript bundle size
 *
 * Trade-offs:
 * - Increased server load
 * - Longer server response times
 * - Less dynamic behavior
 *
 * @returns JSX element with pre-loaded cart data
 */
export async function CartProvider() {
  try {
    /**
     * Server-side cart data fetching
     *
     * Uses tRPC server client to fetch data during SSR. The procedure
     * itself resolves either the logged-in user's cart or, for a
     * logged-out visitor, their guest cart via the guest-id cookie — so
     * this no longer needs to branch on `getUserFromCookie()` first.
     */
    const cartItems = await caller.cart.cartHydration();

    // Transform server data to client format
    // Same transformation logic as client-side version for consistency
    const items =
      cartItems?.map((item) => ({
        // Convert ObjectId to string for client compatibility
        productId: item.productId.toString(),
        quantity: item.quantity,
        // Handle optional size selection
        size: item.selectedSize?.size,
      })) || [];

    // Pass pre-loaded data to client component
    return <CartHydrationClient initialCart={items} />;
  } catch (error) {
    // Server-side error handling
    // Log the error but don't crash the page
    console.error("CartProvider: Failed to fetch cart on server:", error);

    // Optional: Report to error monitoring service
    // errorReportingService.captureException(error, {
    //   context: 'server-side-cart-fetch'
    // })

    // Graceful fallback - render with empty cart
    return <CartHydrationClient initialCart={null} />;
  }
}
