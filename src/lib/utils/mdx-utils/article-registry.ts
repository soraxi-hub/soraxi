import "server-only";

import type { MDXModule } from "mdx/types";

/**
 * Loader for a single documentation article.
 *
 * Deliberately a thunk rather than an eager import: the article only reaches
 * the bundle of the request that renders it.
 */
export type ArticleLoader = () => Promise<MDXModule>;

/**
 * Every documentation article, keyed by its `category/page` slug.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS AN EXPLICIT MAP
 * ─────────────────────────────────────────────────────────────────────────────
 * The route used to build its import path at runtime:
 *
 *   const modulePath = `@/app/docs/articles/${category}/${page}.mdx`;
 *   await import(modulePath);
 *
 * No bundler can resolve that. The argument is a bare variable, so there is no
 * static prefix to build a context from, and the `@/` alias is a compile-time
 * resolution concern that never survives into a runtime string. Writing it
 * relatively (`../articles/${category}/${page}.mdx`) does resolve under webpack
 * — by pulling *every* file under that directory into a context module — but
 * behaves differently under Turbopack.
 *
 * Here each path is a string literal, so both bundlers resolve it, each article
 * is its own chunk, and — via `ArticleSlug` in `help-center-data.ts` — a nav
 * entry pointing at a file that does not exist is a type error rather than a
 * 404 found by clicking.
 *
 * Adding an article: create the `.mdx` file, add a line here, then list it in
 * `helpCenterCategories` so it appears in the sidebar.
 */
export const articleRegistry = {
  // ─── Account & Verification ────────────────────────────────────────────────
  "account/create-account": () =>
    import("@/app/docs/articles/account/create-account.mdx"),
  "account/verify-account": () =>
    import("@/app/docs/articles/account/verify-account.mdx"),
  "account/account-security": () =>
    import("@/app/docs/articles/account/account-security.mdx"),
  "account/password-reset": () =>
    import("@/app/docs/articles/account/password-reset.mdx"),

  // ─── Buying ────────────────────────────────────────────────────────────────
  "buying/browse-and-search": () =>
    import("@/app/docs/articles/buying/browse-and-search.mdx"),
  "buying/cart-and-checkout": () =>
    import("@/app/docs/articles/buying/cart-and-checkout.mdx"),
  "buying/order-statuses": () =>
    import("@/app/docs/articles/buying/order-statuses.mdx"),
  "buying/delivery-code": () =>
    import("@/app/docs/articles/buying/delivery-code.mdx"),
  "buying/confirming-delivery": () =>
    import("@/app/docs/articles/buying/confirming-delivery.mdx"),
  "buying/wishlist-and-reviews": () =>
    import("@/app/docs/articles/buying/wishlist-and-reviews.mdx"),
  "buying/requests": () => import("@/app/docs/articles/buying/requests.mdx"),
  "buying/messaging-a-vendor": () =>
    import("@/app/docs/articles/buying/messaging-a-vendor.mdx"),

  // ─── Buyer Protection ──────────────────────────────────────────────────────
  "protection/how-escrow-works": () =>
    import("@/app/docs/articles/protection/how-escrow-works.mdx"),
  "protection/opening-a-dispute": () =>
    import("@/app/docs/articles/protection/opening-a-dispute.mdx"),
  "protection/refunds-and-cancellations": () =>
    import("@/app/docs/articles/protection/refunds-and-cancellations.mdx"),
  "protection/staying-safe": () =>
    import("@/app/docs/articles/protection/staying-safe.mdx"),

  // ─── Selling ───────────────────────────────────────────────────────────────
  "storefront/vendor-waitlist": () =>
    import("@/app/docs/articles/storefront/vendor-waitlist.mdx"),
  "storefront/create-storefront": () =>
    import("@/app/docs/articles/storefront/create-storefront.mdx"),
  "storefront/manage-products": () =>
    import("@/app/docs/articles/storefront/manage-products.mdx"),
  "storefront/shipping-setup": () =>
    import("@/app/docs/articles/storefront/shipping-setup.mdx"),
  "storefront/store-settings": () =>
    import("@/app/docs/articles/storefront/store-settings.mdx"),
  "storefront/store-status": () =>
    import("@/app/docs/articles/storefront/store-status.mdx"),

  // ─── Orders & Fulfilment ───────────────────────────────────────────────────
  "fulfilment/order-fulfilment": () =>
    import("@/app/docs/articles/fulfilment/order-fulfilment.mdx"),
  "fulfilment/proof-of-delivery": () =>
    import("@/app/docs/articles/fulfilment/proof-of-delivery.mdx"),
  "fulfilment/vendor-disputes": () =>
    import("@/app/docs/articles/fulfilment/vendor-disputes.mdx"),

  // ─── Getting Paid ──────────────────────────────────────────────────────────
  "payouts/how-you-get-paid": () =>
    import("@/app/docs/articles/payouts/how-you-get-paid.mdx"),
  "storefront/payout-settings": () =>
    import("@/app/docs/articles/storefront/payout-settings.mdx"),
  "payouts/withdrawals": () =>
    import("@/app/docs/articles/payouts/withdrawals.mdx"),
  "payouts/fees-and-commission": () =>
    import("@/app/docs/articles/payouts/fees-and-commission.mdx"),
} satisfies Record<string, ArticleLoader>;

/** The slug of every article that exists on disk. */
export type ArticleSlug = keyof typeof articleRegistry;

/**
 * Resolves a slug to its loader, or `undefined` when no such article exists.
 *
 * The `hasOwn` guard matters: a slug like `constructor` would otherwise walk
 * the prototype chain and hand back something that is not a loader.
 */
export function getArticleLoader(slug: string): ArticleLoader | undefined {
  return Object.hasOwn(articleRegistry, slug)
    ? articleRegistry[slug as ArticleSlug]
    : undefined;
}

/** Every article slug, for `generateStaticParams`. */
export function allArticleSlugs(): ArticleSlug[] {
  return Object.keys(articleRegistry) as ArticleSlug[];
}
