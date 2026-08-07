/**
 * Proof-of-delivery constants shared by server and client.
 *
 * Deliberately free of any `server-only` import. The rider's code input and the
 * vendor's confirmation dialog are client components and need the code length;
 * pulling that from the crypto module would drag `server-only` into the client
 * bundle and break the build.
 *
 * Keep this file free of logic — anything that touches randomness, hashing or
 * the database belongs in `lib/utils/delivery-proof.ts`, which is server-only.
 */

/** Digits in a delivery code. */
export const DELIVERY_CODE_LENGTH = 6;

/**
 * Failed attempts before a delivery link is permanently dead.
 *
 * This is the control that actually protects the code. Six digits with
 * unlimited guesses is no protection; six digits with three attempts leaves a
 * 3-in-a-million chance and no way to work offline.
 *
 * Terminal by design — no cooldown, no reset. A locked link means the vendor
 * falls back to entering the code themselves or declaring delivery without
 * proof, both of which are supported.
 */
export const MAX_DELIVERY_CODE_ATTEMPTS = 3;

/** How long a delivery link stays usable after the sub-order ships. */
export const DELIVERY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;
