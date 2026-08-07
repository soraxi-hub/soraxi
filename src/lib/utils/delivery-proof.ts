import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

import { DELIVERY_CODE_LENGTH } from "@/constants/delivery";

// Re-exported for server-side callers, so they need only one import. Client
// components must import from `@/constants/delivery` directly — this module is
// server-only and pulling it into a client bundle breaks the build.
export {
  DELIVERY_CODE_LENGTH,
  DELIVERY_TOKEN_TTL_MS,
  MAX_DELIVERY_CODE_ATTEMPTS,
} from "@/constants/delivery";

/**
 * Helpers for proof of delivery.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SECURITY MODEL
 * ─────────────────────────────────────────────────────────────────────────────
 * There are two artefacts and they are not equally sensitive.
 *
 * The **code** is the secret. Only the customer ever sees it, and entering it
 * is the evidence that the buyer was present at handover.
 *
 * The **token** is not a secret. It is the unguessable part of a link the
 * vendor forwards over WhatsApp to whoever is delivering. Holding it lets you
 * *attempt* a confirmation; it never lets you complete one, because the code is
 * still required.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY BOTH ARE STORED IN PLAINTEXT
 * ─────────────────────────────────────────────────────────────────────────────
 * Both must be **retrievable**, not merely verifiable: the customer's order
 * page renders their code on every visit, and the vendor re-copies their link
 * whenever they hand goods to a different rider. A one-way hash cannot serve
 * either screen.
 *
 * Hashing would also buy very little. A 6-digit code has a million
 * possibilities — anyone with database read access brute-forces a hash of it
 * offline in milliseconds. The protection that actually holds is
 * `MAX_DELIVERY_CODE_ATTEMPTS`, which caps *online* guessing at three: a
 * 3-in-a-million chance, and no way to work offline.
 *
 * Constant-time comparison is still used, because response timing is an online
 * side channel that the attempt limit does not close.
 *
 * A future hardening step would be encrypting the code at rest with a KMS key,
 * which keeps it retrievable while protecting it from casual database exposure
 * (backups, logs, support tooling). That is a key-management project, not a
 * one-line change, and is deliberately deferred.
 */

/**
 * Generates a 6-digit delivery code.
 *
 * Uses `randomInt`, which draws from the CSPRNG and is free of the modulo bias
 * that `Math.random()`-based digit picking introduces. Leading zeros are
 * preserved — the code is a string, never a number.
 */
export function generateDeliveryCode(): string {
  let code = "";

  for (let i = 0; i < DELIVERY_CODE_LENGTH; i++) {
    code += randomInt(10).toString();
  }

  return code;
}

/**
 * Generates the unguessable segment of a delivery link.
 *
 * 32 bytes of entropy, hex-encoded. Long enough that enumeration is not a
 * consideration, short enough to sit in a URL a rider might retype.
 */
export function generateDeliveryToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Constant-time comparison of a supplied code against the stored one.
 *
 * `timingSafeEqual` rather than `===` so response time cannot be used to
 * discover the code digit by digit. Both sides are hashed first purely to
 * normalise them to a fixed length — `timingSafeEqual` throws on length
 * mismatch, and a supplied value of the wrong length must fail like any other
 * wrong answer rather than erroring differently.
 */
export function verifyDeliveryCode(
  supplied: string,
  stored: string | undefined,
): boolean {
  if (!stored) return false;

  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(stored).digest();

  return timingSafeEqual(a, b);
}

/** `482917` → `482 917`, for display only. */
export function formatDeliveryCode(code: string): string {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)} ${code.slice(half)}`;
}

/** Absolute URL for a rider confirmation link. */
export function buildDeliveryLink(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/d/${token}`;
}
