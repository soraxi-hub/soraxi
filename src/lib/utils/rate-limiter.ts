import { getRateLimitModel } from "@/lib/db/models/rate-limit.model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  /** Whether the request is within the allowed limit */
  allowed: boolean;
  /** Current call count for this window */
  count: number;
  /** Seconds until the window resets — 0 when allowed */
  retryAfter: number;
}

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

/**
 * Fixed-window rate limiter backed by MongoDB.
 *
 * Uses a single atomic findOneAndUpdate+upsert to both increment the counter
 * and create the window document, so there is no read-then-write race.
 *
 * The document expires automatically via a MongoDB TTL index on `expiresAt`,
 * so no manual cleanup is required.
 *
 * @param key       Unique identifier for the caller — e.g. "ai-desc:<storeId>"
 * @param limit     Maximum number of allowed requests per window
 * @param windowMs  Window duration in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const RateLimit = await getRateLimitModel();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMs);

  // Atomic increment — if no live window document exists for this key, upsert
  // creates one with count=1 and the correct expiry. $setOnInsert only fires
  // on the initial insert, leaving expiresAt/windowStart untouched on updates.
  const record = await RateLimit.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    {
      $inc: { count: 1 },
      $setOnInsert: { key, windowStart: now, expiresAt: windowEnd },
    },
    { upsert: true, new: true },
  );

  const allowed = record.count <= limit;
  const retryAfter = allowed
    ? 0
    : Math.ceil((record.expiresAt.getTime() - now.getTime()) / 1000);

  return { allowed, count: record.count, retryAfter };
}
