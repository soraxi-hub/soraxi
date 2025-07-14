import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { HomePage } from "@/modules/home/HomePage";
import { CartProvider } from "@/modules/cart/cart-provider";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";

/**
 * Home Page
 * Main landing page showcasing products and features
 *
 * The main landing page of the application.
 * Includes the CartHydration component to ensure user's cart
 * is loaded and available throughout the application.
 *
 * Architecture note: CartHydration is included at the page level
 * rather than in the layout to provide more granular control
 * over when cart hydration occurs.
 */
export default async function Home() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(trpc.home.getPublicProducts.queryOptions({}));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Suspense fallback={<div>Loading...</div>}>
          {/* 
            CartHydration component handles loading user's cart data
            Must be included early in the component tree to ensure
            cart data is available for other components that depend on it
          */}
          <CartProvider />
          <HomePage />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
}
