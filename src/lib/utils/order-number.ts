/**
 * Human-readable order references.
 *
 * Orders are keyed by ObjectId, which is unusable in conversation — nobody
 * reads "68787e7be70173fd23f68a76" down a phone line. This derives a short,
 * stable label for display instead.
 *
 * Deliberately derived rather than stored:
 *
 *   - No schema change, and nothing that can drift out of sync with the order.
 *   - No counter, so no read-modify-write inside the order-creation
 *     transaction. That path is financial code; adding contention to it to
 *     produce a display string is a poor trade.
 *   - Stable forever, because an ObjectId never changes.
 *
 * The cost is that references are not sequential: `ORD-2026-8A3F2`, not
 * `ORD-2026-00411`. They remain unique in practice (the suffix is drawn from
 * the ObjectId, which is already unique) and are searchable, which is what
 * support and buyers actually need from them.
 */

/**
 * Formats an order or sub-order id into a display reference.
 *
 * @param id     - The order or sub-order ObjectId, as a string
 * @param placedAt - When the order was placed; supplies the year segment
 * @returns e.g. `ORD-2026-8A3F2`
 *
 * @example
 * formatOrderNumber("68787e7be70173fd23f68a76", new Date("2026-08-02"))
 * // → "ORD-2026-68A76"
 */
export function formatOrderNumber(
  id: string,
  placedAt: Date | string | number,
): string {
  const year = new Date(placedAt).getFullYear();

  // Trailing characters of an ObjectId carry the counter and machine/process
  // bits, so they vary far more between orders than the leading timestamp
  // bytes — which are near-identical for orders placed the same second.
  const suffix = id.slice(-5).toUpperCase();

  return `ORD-${year}-${suffix}`;
}
