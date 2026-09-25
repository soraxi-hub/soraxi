import { v4 as uuidv4 } from "uuid";

/**
 * Generates a unique alphanumeric ID of a specified length.
 * This function creates a UUID (Universally Unique Identifier), removes hyphens,
 * and returns the first `length` characters.
 *
 * @param {number} length - The desired length of the unique ID (must be ≤ 32, since UUIDs without hyphens are 32 chars long).
 * @returns {string} A truncated uppercase alphanumeric string from the UUID.
 *
 * @example
 * // Returns something like "3F7A9B2E" (first 8 chars of a UUID without hyphens)
 * const id = generateUniqueId(8);
 *
 * @example
 * // Can be used to generate request numbers like "WDR-3F7A9B2E"
 * const requestNumber = `WDR-${generateUniqueId(8).toUpperCase()}`;
 */
export function generateUniqueId(length: number): string {
  // Generate a UUID and remove all hyphens
  const uuid = uuidv4().replace(/-/g, "");

  // Return the first 'length' characters
  return uuid.substring(0, length);
}

/**
 * Generates a persisted order/sub-order reference.
 *
 * @param placedAt - When the order was placed; supplies the year segment
 * @returns e.g. `ORD-2026-4F9A1B7C3D08`
 */
export function generateOrderReference(
  placedAt: Date | string | number,
): string {
  const year = new Date(placedAt).getFullYear();
  return `ORD-${year}-${generateUniqueId(12).toUpperCase()}`;
}
