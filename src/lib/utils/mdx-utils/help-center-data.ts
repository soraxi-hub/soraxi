import {
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Type-only — erased at compile time, so the `server-only` module it lives in
// is never pulled into the client bundle by the sidebar.
import type { ArticleSlug } from "./article-registry";

/**
 * The documentation table of contents.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH
 * ─────────────────────────────────────────────────────────────────────────────
 * The sidebar, the /docs landing cards and the route's static params all read
 * this file. The landing page used to hardcode its own copy of the categories,
 * which meant adding one was two edits and a chance to disagree with itself.
 *
 * `slug` is typed as `ArticleSlug`, so an entry can only point at an article
 * that is actually registered in `article-registry.ts`.
 *
 * A page's category here is **editorial** and need not match its file path —
 * `storefront/payout-settings` is listed under Getting Paid, where vendors look
 * for it, while keeping the URL it has always had.
 */
export type DocPage = {
  id: string;
  title: string;
  slug: ArticleSlug;
};

export type DocCategory = {
  id: string;
  /** Sidebar heading. */
  name: string;
  /** Short label — the category's subject in a few words. */
  description: string;
  /** How the category is presented on the /docs landing page. */
  card: {
    title: string;
    description: string;
    icon: LucideIcon;
    popular?: boolean;
  };
  pages: DocPage[];
};

export const helpCenterCategories: DocCategory[] = [
  {
    id: "account",
    name: "Account & Verification",
    description: "Account Management",
    card: {
      title: "Getting Started",
      description: "New to Soraxi? Start your journey here",
      icon: User,
      popular: true,
    },
    pages: [
      {
        id: "create-account",
        title: "Creating Your Account",
        slug: "account/create-account",
      },
      {
        id: "verify-account",
        title: "Account Verification",
        slug: "account/verify-account",
      },
      {
        id: "account-security",
        title: "Account Security",
        slug: "account/account-security",
      },
      {
        id: "password-reset",
        title: "Resetting Your Password",
        slug: "account/password-reset",
      },
    ],
  },
  {
    id: "buying",
    name: "Buying on Soraxi",
    description: "For Shoppers & Customers",
    card: {
      title: "For Shoppers",
      description: "Finding things, ordering them, and getting them delivered",
      icon: ShoppingBag,
      popular: true,
    },
    pages: [
      {
        id: "browse-and-search",
        title: "Finding What You Need",
        slug: "buying/browse-and-search",
      },
      {
        id: "cart-and-checkout",
        title: "Cart & Checkout",
        slug: "buying/cart-and-checkout",
      },
      {
        id: "order-statuses",
        title: "Understanding Order Statuses",
        slug: "buying/order-statuses",
      },
      {
        id: "delivery-code",
        title: "Your Delivery Code",
        slug: "buying/delivery-code",
      },
      {
        id: "confirming-delivery",
        title: "Confirming Delivery",
        slug: "buying/confirming-delivery",
      },
      {
        id: "wishlist-and-reviews",
        title: "Wishlist & Reviews",
        slug: "buying/wishlist-and-reviews",
      },
      {
        id: "requests",
        title: "Requests: Ask For What You Need",
        slug: "buying/requests",
      },
      {
        id: "messaging-a-vendor",
        title: "Messaging a Vendor",
        slug: "buying/messaging-a-vendor",
      },
    ],
  },
  {
    id: "protection",
    name: "Buyer Protection",
    description: "Trust & Safety",
    card: {
      title: "Buyer Protection",
      description: "How escrow, disputes and refunds keep your money safe",
      icon: ShieldCheck,
      popular: true,
    },
    pages: [
      {
        id: "how-escrow-works",
        title: "How Escrow Protects You",
        slug: "protection/how-escrow-works",
      },
      {
        id: "opening-a-dispute",
        title: "Opening a Dispute",
        slug: "protection/opening-a-dispute",
      },
      {
        id: "refunds-and-cancellations",
        title: "Refunds & Cancellations",
        slug: "protection/refunds-and-cancellations",
      },
      {
        id: "staying-safe",
        title: "Buying Safely on Soraxi",
        slug: "protection/staying-safe",
      },
    ],
  },
  {
    id: "storefront",
    name: "Selling on Soraxi",
    description: "For Vendors & Sellers",
    card: {
      title: "For Sellers & Entrepreneurs",
      description: "Everything you need to start and grow your business",
      icon: Store,
      popular: true,
    },
    pages: [
      {
        id: "vendor-waitlist",
        title: "Applying to Sell on Soraxi",
        slug: "storefront/vendor-waitlist",
      },
      {
        id: "create-storefront",
        title: "Setting Up Your Store",
        slug: "storefront/create-storefront",
      },
      {
        id: "manage-products",
        title: "Managing Your Products",
        slug: "storefront/manage-products",
      },
      {
        id: "shipping-setup",
        title: "Setting Up Shipping",
        slug: "storefront/shipping-setup",
      },
      {
        id: "store-settings",
        title: "Store Settings",
        slug: "storefront/store-settings",
      },
      {
        id: "store-status",
        title: "Store Status & Suspension",
        slug: "storefront/store-status",
      },
    ],
  },
  {
    id: "fulfilment",
    name: "Orders & Fulfilment",
    description: "For Vendors",
    card: {
      title: "Fulfilling Orders",
      description: "Processing orders, proving delivery, and handling disputes",
      icon: Truck,
    },
    pages: [
      {
        id: "order-fulfilment",
        title: "Fulfilling an Order",
        slug: "fulfilment/order-fulfilment",
      },
      {
        id: "proof-of-delivery",
        title: "Proof of Delivery",
        slug: "fulfilment/proof-of-delivery",
      },
      {
        id: "vendor-disputes",
        title: "When a Buyer Disputes an Order",
        slug: "fulfilment/vendor-disputes",
      },
    ],
  },
  {
    id: "payouts",
    name: "Getting Paid",
    description: "Earnings & Withdrawals",
    card: {
      title: "Getting Paid",
      description: "Escrow, your wallet, withdrawals and what Soraxi charges",
      icon: Wallet,
    },
    pages: [
      {
        id: "how-you-get-paid",
        title: "How You Get Paid",
        slug: "payouts/how-you-get-paid",
      },
      {
        id: "payout-settings",
        title: "Payout Configuration",
        slug: "storefront/payout-settings",
      },
      {
        id: "withdrawals",
        title: "Withdrawing Your Earnings",
        slug: "payouts/withdrawals",
      },
      {
        id: "fees-and-commission",
        title: "Fees & Commission",
        slug: "payouts/fees-and-commission",
      },
    ],
  },
  // Planned categories. Uncomment one once its articles exist and are
  // registered in `article-registry.ts` — an unregistered slug will not compile.
  //
  // {
  //   id: "updates",
  //   name: "Updates & Announcements",
  //   description: "News & Updates",
  //   card: {
  //     title: "What's New",
  //     description: "Feature releases, policy changes and maintenance notices",
  //     icon: Megaphone, // add to the lucide-react import above
  //   },
  //   pages: [
  //     { id: "new-features", title: "New Features", slug: "updates/new-features" },
  //     { id: "policy-updates", title: "Policy Updates", slug: "updates/policy-updates" },
  //   ],
  // },
];

/** Where a category's card links to — its first article. */
export const categoryEntryHref = (category: DocCategory): string =>
  `/docs/${category.pages[0].slug}`;
