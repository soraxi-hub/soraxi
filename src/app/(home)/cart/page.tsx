import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { caller } from "@/trpc/server";
import { CartPageClient } from "@/modules/cart/cart-page-client";
import { EmptyCart } from "@/modules/cart/empty-cart";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Your Shopping Cart`,
  description:
    "View and manage the items in your shopping cart. Secure checkout, escrow-protected payments, and fast delivery with Soraxi.",
  keywords: [
    "Soraxi cart",
    "shopping cart",
    "view cart",
    "secure checkout",
    "online shopping",
    "escrow payments",
    "Soraxi orders",
  ],
  openGraph: {
    title: "Your Shopping Cart | Soraxi",
    description:
      "Review your items and proceed to secure checkout with escrow protection on Soraxi.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
    siteName: "Soraxi",
    images: [
      {
        url: "/og-soraxi.png",
        width: 1200,
        height: 630,
        alt: "Soraxi Shopping Cart",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Shopping Cart | Soraxi",
    description: "Manage your cart and proceed to secure checkout on Soraxi.",
    images: ["/og-soraxi.png"],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
  },
  robots: {
    index: false, // ✅ best practice: prevent indexing cart pages
    follow: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * Type definition for cart items to ensure type safety
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

/**
 * Server-Side Cart Page Component
 *
 * This server component handles:
 * - User authentication via server-side cookie validation
 * - Pre-loading cart data and product details on the server
 * - Eliminating hydration mismatches by providing initial data
 * - Improved SEO and initial page load performance
 *
 * The data fetching happens during SSR, ensuring the cart is immediately
 * available when the page renders on the client.
 */
export default async function CartPage() {
  try {
    // Server-side user authentication
    // This runs during SSR with access to request cookies
    const user = await getUserFromCookie();

    // Handle unauthenticated users
    if (!user) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Please log in to view your cart
            </p>
            <EmptyCart />
          </div>
        </div>
      );
    }

    /**
     * Server-side cart data fetching
     *
     * Fetch both cart items and detailed product information on the server.
     * This approach provides several benefits:
     * - No loading states on initial render
     * - Better SEO (cart content is server-rendered)
     * - Reduced client-side JavaScript execution
     * - Elimination of hydration mismatches
     */
    const cartData = await caller.cart.getByUserId();

    // Handle empty cart case
    if (!cartData || cartData.items.length === 0) {
      return (
        <div className="container mx-auto px-4 py-8">
          <EmptyCart />
        </div>
      );
    }

    // Extract product IDs from cart items
    const productIds = cartData.items.map((item) => item.productId.toString());

    // Fetch detailed product information for all cart items
    const products = await caller.cart.getManyByIds({ ids: productIds });

    /**
     * Transform and merge cart data with product details
     *
     * Create the final cart items structure that combines:
     * - Cart-specific data (quantity, size, etc.) from the cart collection
     * - Product details (name, price, image, etc.) from the products collection
     *
     * This transformation happens on the server, reducing client-side processing.
     * We use proper type narrowing to ensure TypeScript compatibility.
     */
    const hydratedCartItems: CartItemType[] = cartData.items
      .map((cartItem) => {
        const product = products?.find(
          (p) => p.id === cartItem.productId.toString()
        );

        // Skip items where product is not found or essential data is missing
        if (!product || typeof product.price !== "number") {
          console.warn(
            `Product not found or invalid data for cart item: ${cartItem.productId}`
          );
          return null;
        }

        // Create properly typed cart item
        const cartItemData: CartItemType = {
          id: `${cartItem.productId}-${
            cartItem.selectedSize?.size ?? "nosize"
          }`,
          productId: cartItem.productId.toString(),
          name: product.name,
          slug: product.slug,
          image: product.image,
          price: product.price, // Now guaranteed to be a number
          quantity: cartItem.quantity,
          size: cartItem.selectedSize?.size,
          inStock: product.inStock ?? true, // Default to true if undefined
          maxQuantity: product.maxQuantity ?? 99, // Default to 99 if undefined
        };

        return cartItemData;
      })
      .filter((item): item is CartItemType => item !== null); // Type-safe filter

    // If no valid items after filtering, show empty cart
    if (hydratedCartItems.length === 0) {
      return (
        <div className="container mx-auto px-4 py-8">
          <EmptyCart />
        </div>
      );
    }

    /**
     * Calculate order totals on the server
     *
     * Pre-calculating totals on the server ensures consistency
     * and reduces client-side computation on initial render.
     */
    const subtotal = hydratedCartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    // const shipping = subtotal >= 50000 ? 0 : 5000; // Free shipping over ₦50,000
    // const tax = Math.round(subtotal * 0.075); // 7.5% tax rate
    // const discount = 0; // Placeholder for future discount logic
    const total = subtotal;

    const orderSummary = {
      subtotal,
      // shipping,
      // tax,
      // discount,
      total,
      itemCount: hydratedCartItems.length,
    };

    // Render the page with pre-loaded data
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
              ({hydratedCartItems.length} item
              {hydratedCartItems.length > 1 ? "s" : ""})
            </span>
          </div>
        </div>

        {/* Pass pre-loaded data to client component */}
        <CartPageClient
          initialCartItems={hydratedCartItems}
          initialOrderSummary={orderSummary}
        />
      </div>
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
