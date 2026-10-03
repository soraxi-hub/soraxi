/**
 * Coupon Constants
 *
 * Shared between the Zod validator and the Mongoose schema so the two
 * never drift apart on what a valid coupon code looks like.
 */

/** Shortest a coupon code can be. */
export const COUPON_CODE_MIN_LENGTH = 3;

/** Longest a coupon code can be. */
export const COUPON_CODE_MAX_LENGTH = 20;
