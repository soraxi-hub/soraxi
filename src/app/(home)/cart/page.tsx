import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { CartPageClient } from "@/modules/cart/cart-page-client";
import { EmptyCart } from "@/modules/cart/empty-cart";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { CartProvider } from "@/modules/cart/cart-provider";
import { CartService } from "@/services/cart/cart.service";

export const metadata: Metadata = {
  title: `Your Shopping Cart`,
  description: `View and manage the items in your shopping cart. Secure checkout, escrow-protected payments, and fast delivery with ${siteConfig.name}.`,
  keywords: [
    `${siteConfig.name} cart`,
    "shopping cart",
    "view cart",
    "secure checkout",
    "online shopping",
    "escrow payments",
    `${siteConfig.name} orders`,
  ],
  openGraph: {
    title: `Your Shopping Cart | ${siteConfig.name}`,
    description: `Review your items and proceed to secure checkout with escrow protection on ${siteConfig.name}.`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
    siteName: `${siteConfig.name}`,
    images: [
      {
        url: "/og-soraxi.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} Shopping Cart`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Your Shopping Cart | ${siteConfig.name}`,
    description: `Manage your cart and proceed to secure checkout on ${siteConfig.name}.`,
    images: ["/og-soraxi.png"],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
  },
  robots: {
    index: false, // prevent indexing cart pages
    follow: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * Server-Side Cart Page Component
 *
 * This server component handles:
 * - Pre-loading cart data and product details on the server
 * - Eliminating hydration mismatches by providing initial data
 * - Improved SEO and initial page load performance
 *
 * The data fetching happens during SSR, ensuring the cart is immediately
 * available when the page renders on the client.
 */
export default async function CartPage() {
  try {
    const user = await getUserFromCookie();

    // Handle unauthenticated users
    if (!user) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Please log in to view your cart
            </p>
            <EmptyCart showLogInBtn />
          </div>
        </div>
      );
    }

    const cartData = await CartService.getPopulatedCart(user.id);

    // Handle empty cart case
    if (!cartData || cartData.itemCount === 0) {
      return (
        <div className="container mx-auto px-4 py-8">
          <EmptyCart />
        </div>
      );
    }

    const orderSummary = {
      subtotal: cartData.subtotal,
      total: cartData.subtotal,
      itemCount: cartData.itemCount,
    };

    return (
      <>
        <CartProvider />

        {/* Pass pre-loaded data to client component */}
        <CartPageClient
          initialCartItems={cartData.items}
          initialOrderSummary={orderSummary}
        />
      </>
    );
  } catch (error) {
    // Server-side error handling
    console.error("CartPage: Failed to load cart data:", error);

    // Graceful error fallback
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">
            Failed to load cart data. Please try refreshing the page.
          </p>
          <EmptyCart />
        </div>
      </div>
    );
  }
}
