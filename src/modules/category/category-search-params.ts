import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

/** Page size for the category grid. Mirrors the procedure's own default. */
export const PRODUCTS_PER_PAGE = 20;

/** Upper bound of the price slider, in naira. */
export const MAX_PRICE = 1_000_000;

export const SORT_OPTIONS = [
  "newest",
  "price-asc",
  "price-desc",
  "rating-desc",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

/**
 * Every knob on the category page lives in the URL rather than in component
 * state. Three things depend on that: the server can render the correct grid
 * on the first request, a filtered view can be linked and shared, and the
 * pager can be a set of real crawlable links instead of a click handler.
 */
export const categorySearchParams = {
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral(SORT_OPTIONS).withDefault("newest"),
  search: parseAsString,
  minPrice: parseAsInteger.withDefault(0),
  maxPrice: parseAsInteger.withDefault(MAX_PRICE),
  inStock: parseAsBoolean.withDefault(false),
  ratings: parseAsArrayOf(parseAsInteger).withDefault([]),
};

export type CategorySearchParams = {
  page: number;
  sort: SortOption;
  search: string | null;
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  ratings: number[];
};

/** Reads the params server-side, in the page and in `generateMetadata`. */
export const loadCategorySearchParams = createLoader(categorySearchParams);

/** Builds hrefs for the pager, which must be anchors for crawlers to follow. */
export const serializeCategorySearchParams = createSerializer(
  categorySearchParams
);

/**
 * The tRPC input for a given category view.
 *
 * Shared by the server prefetch and the client query on purpose: React Query
 * matches cache entries by the serialized input, so the two must construct it
 * identically or the client refetches everything the server already sent.
 */
export function buildCategoryProductsInput({
  categorySlug,
  subcategorySlug,
  params,
}: {
  categorySlug: string;
  subcategorySlug?: string;
  params: CategorySearchParams;
}) {
  return {
    page: params.page,
    limit: PRODUCTS_PER_PAGE,
    category: categorySlug !== "all" ? categorySlug : undefined,
    subCategory: subcategorySlug || undefined,
    verified: true,
    search: params.search,
    sort: params.sort,
    priceMin: params.minPrice,
    priceMax: params.maxPrice,
    // Only narrow when the box is ticked; `false` would still be a filter.
    inStock: params.inStock || undefined,
    ratings: params.ratings.length > 0 ? params.ratings : undefined,
  };
}
