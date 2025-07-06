import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { caller } from "@/trpc/server";
import { CheckoutPageClient } from "./checkout-page-client";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShoppingBag } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { redirect } from "next/navigation";
import { CartProvider } from "@/modules/cart/cart-provider";

/**
 * Server-Side Checkout Page Component
 *
 * This server component handles:
 * - Server-side user authentication via HTTP-only cookies
 * - Pre-loading cart data grouped by store
 * - Pre-loading user profile information
 * - Server-side cart validation
 * - Eliminating hydration mismatches
 * - Better SEO and initial page load performance
 *
 * Architecture Benefits:
 * - Secure cookie handling on the server
 * - No client-side loading states for initial data
 * - Better error handling with proper fallbacks
 * - Reduced client-side JavaScript bundle size
 */
export default async function CheckoutPage() {
  try {
    /**
     * Server-Side User Authentication
     *
     * Validates user session using HTTP-only cookies on the server.
     * This approach is more secure than client-side cookie handling
     * and eliminates the need for client-side authentication checks.
     */
    const user = await getUserFromCookie();

    // Handle unauthenticated users - redirect to login
    if (!user) {
      redirect("/sign-in?redirect=/checkout");
    }

    /**
     * Parallel Data Fetching
     *
     * Fetch cart data and user profile simultaneously for optimal performance.
     * Using Promise.all ensures both requests happen concurrently,
     * reducing the total server response time.
     */
    const [cartData, userData] = await Promise.all([
      // Fetch grouped cart data with store information and shipping methods
      caller.checkout.getGroupedCart({ userId: user.id }),

      // Fetch complete user profile for shipping information
      caller.user.getById({ id: user.id }),
    ]);

    // console.log("cartData", cartData);
    // console.log("userData", userData);

    /**
     * Cart Validation
     *
     * Validate cart contents on the server to catch issues early.
     * This prevents users from proceeding with invalid cart items
     * and provides immediate feedback.
     */
    let initialValidationErrors: string[] = [];
    try {
      const validationResult = await caller.checkout.validateUserCart({
        userId: user.id,
      });
      if (!validationResult.isValid) {
        initialValidationErrors = validationResult.validationErrors;
      }
    } catch (validationError) {
      console.error("Initial cart validation failed:", validationError);
      // Continue with checkout but show validation errors in UI
    }

    // Handle empty cart case
    if (!cartData || cartData.totalQuantity === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-semibold">Your cart is empty</h2>
            <p className="text-muted-foreground max-w-md">
              Add some items to your cart before checking out. Browse our
              collection to find products you love.
            </p>
            <Button
              asChild
              className="bg-soraxi-green hover:bg-soraxi-green/85"
            >
              <a href="/">Continue Shopping</a>
            </Button>
          </div>
        </div>
      );
    }

    // Handle missing user data
    if (!userData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Profile Error</AlertTitle>
            <AlertDescription>
              Unable to load your profile information. Please try refreshing the
              page or contact support.
            </AlertDescription>
          </Alert>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" asChild>
              <a href="/cart">Return to Cart</a>
            </Button>
            <Button asChild>
              <a href="/profile">Update Profile</a>
            </Button>
          </div>
        </div>
      );
    }

    /**
     * Pre-calculate shipping requirements
     *
     * Determine which stores require shipping method selection
     * to provide better initial state for the client component.
     */
    const storesRequiringShipping = cartData.groupedCart.filter((group) => {
      // Check if store has physical products
      const hasPhysicalProducts = group.products.some(
        (p) => p.productType === "Product"
      );

      // Check if store has shipping methods available
      const hasShippingMethods =
        group.shippingMethods && group.shippingMethods.length > 0;

      return hasPhysicalProducts && hasShippingMethods;
    });

    // console.log("storesRequiringShipping", storesRequiringShipping);

    /**
     * Prepare initial checkout state
     *
     * Structure the data in a format that's optimal for the client component,
     * reducing client-side processing and improving initial render performance.
     */
    const initialCheckoutState = {
      cartData,
      userData,
      userId: user.id,
      validationErrors: initialValidationErrors,
      storesRequiringShipping: storesRequiringShipping.length,
      hasValidationErrors: initialValidationErrors.length > 0,
    };

    // console.log("initialCheckoutState", initialCheckoutState);

    // Render the page with pre-loaded data
    return (
      <div className="lg:max-w-7xl md:max-w-5xl mx-auto py-6 pt-3 px-4">
        <CartProvider />
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Checkout
          </h1>
          <p className="text-muted-foreground mt-1">
            Review your order and complete your purchase
          </p>
        </div>

        {/* Pass pre-loaded data to client component */}
        <CheckoutPageClient initialState={initialCheckoutState} />
      </div>
    );
  } catch (error) {
    /**
     * Server-Side Error Handling
     *
     * Comprehensive error handling for various failure scenarios:
     * - Database connection issues
     * - Invalid user sessions
     * - Network timeouts
     * - Data corruption
     */
    console.error("CheckoutPage: Failed to load checkout data:", error);

    // Determine error type and provide appropriate user feedback
    const isAuthError =
      error instanceof Error && error.message.includes("authentication");
    const isNetworkError =
      error instanceof Error && error.message.includes("network");

    if (isAuthError) {
      redirect("/sign-in?redirect=/checkout");
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isNetworkError ? "Connection Error" : "Checkout Error"}
          </AlertTitle>
          <AlertDescription>
            {isNetworkError
              ? "Unable to connect to our servers. Please check your internet connection and try again."
              : "Failed to load checkout data. Please try refreshing the page or contact support if the problem persists."}
          </AlertDescription>
        </Alert>

        <div className="flex gap-4 mt-6">
          <Button variant="outline" asChild>
            <a href="/cart">Return to Cart</a>
          </Button>
          <Button asChild>
            <a href="/">Continue Shopping</a>
          </Button>
        </div>
      </div>
    );
  }
}
