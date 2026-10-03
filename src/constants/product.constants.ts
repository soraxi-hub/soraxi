/**
 * Product Constants
 *
 * NOTE ON UNITS: unlike most money in this codebase, these bounds are in
 * Naira, not Kobo. The vendor-facing price form takes a Naira amount, and
 * that raw Naira number is what the Zod validator below checks — the
 * conversion to Kobo happens afterwards, in the Mongoose schema's `price`
 * setter (`src/lib/db/models/product.model.ts`), not before.
 */

/** Lowest price a product (or a product size variant) can be listed at, in Naira. */
export const PRODUCT_PRICE_MIN_NAIRA = 500;

/** Highest price a product can be listed at, in Naira. */
export const PRODUCT_PRICE_MAX_NAIRA = 500_000;
