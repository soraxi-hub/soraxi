/**
 * Payment Gateway Constants
 *
 * Shared integration-level configuration for outbound calls to payment
 * gateways (Paystack, Flutterwave, ...). Money amounts/percentages belong in
 * financial.constants.ts — this file is for HTTP/retry behavior only.
 */

/**
 * Retry policy for a gateway request that fails transiently (network error,
 * 5xx, timeout). `BASE_DELAY_MS` is the starting delay for exponential
 * backoff between attempts.
 */
export const PAYMENT_GATEWAY_RETRY = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 500,
} as const;
