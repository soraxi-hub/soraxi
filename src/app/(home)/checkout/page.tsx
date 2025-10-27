import { serializeData } from "@/lib/utils";
import { EmptyCart } from "@/modules/cart/empty-cart";
import { CheckoutPageClient } from "@/modules/checkout/checkout-page-client";
import { ProfileErrorFallback } from "@/modules/checkout/profile-error-fallback";
import { caller } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  /**
   * Parallel Data Fetching
   *
   * Fetch cart data and user profile simultaneously for optimal performance.
   * Using Promise.all ensures both requests happen concurrently,
   * reducing the total server response time.
   */
  const [rawCartData, rawUserData] = await Promise.all([
    // Fetch grouped cart data with store information and shipping methods
    caller.checkout.getGroupedCart(),

    // Fetch complete user profile for shipping information
    caller.user.getById(),
  ]);

  // Handle empty cart case
  if (!rawCartData || rawCartData.totalQuantity === 0) {
    return <EmptyCart />;
  }

  // Handle missing user data
  if (!rawUserData) {
    return <ProfileErrorFallback />;
  }

  /**
   * Data Serialization
   */
  const cartData = serializeData(rawCartData);
  const userData = serializeData(rawUserData);

  /**
   * Prepare Clean Initial Checkout State
   *
   */
  const initialCheckoutState = {
    cartData: cartData,
    userData: userData,
  };

  return (
    <div className="lg:max-w-7xl md:max-w-5xl mx-auto py-6 pt-3 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Checkout
        </h1>
        <p className="text-muted-foreground mt-1">
          Review your order and complete your purchase
        </p>
      </div>

      <CheckoutPageClient initialState={initialCheckoutState} />
    </div>
  );
}
