/**
 * Financial System Constants
 *
 * Single source of truth for all financial thresholds, percentages,
 * and caps used across the platform's financial system.
 *
 * NOTE: Values marked as "Subject to change" should be reviewed with
 * co-founders before finalising. Update here and nowhere else —
 * all financial logic imports from this file.
 *
 * All monetary values are in Kobo (1 Naira = 100 Kobo).
 */

// ---------------------------------------------------------------------------
// Penalty Constants
// ---------------------------------------------------------------------------

/**
 * The percentage of a suborder's gross amount used as the base
 * for penalty calculation before the cap is applied.
 *
 * Previous: 10% of gross amount
 * Current: 0% of gross amount (Testing things out)
 */
export const PENALTY_BASE_PERCENTAGE = 0;

/**
 * Maximum penalty that can be applied to a vendor for a single upheld dispute.
 * Penalties are capped at this value regardless of the order amount.
 *
 * Current: ₦5,000 (500,000 Kobo)
 */
export const PENALTY_CAP_KOBO = 500_000; // ₦5,000

// ---------------------------------------------------------------------------
// Debt Recovery Constants
// (Subject to change — confirm with co-founders)
// ---------------------------------------------------------------------------

/**
 * The negative wallet balance threshold that determines the debt recovery strategy.
 *
 * - Debt BELOW this threshold → PERCENTAGE_DEDUCTION (gradual recovery)
 * - Debt AT or ABOVE this threshold → FULL_BLOCK (all payouts blocked)
 *
 * Current: ₦30,000 (3,000,000 Kobo)
 * Status: Subject to change
 */
export const DEBT_RECOVERY_THRESHOLD_KOBO = 3_000_000; // ₦30,000

/**
 * The percentage deducted from each future payout to recover a small debt.
 * Only applies when debt is below DEBT_RECOVERY_THRESHOLD_KOBO.
 *
 * Current: 15%
 * Status: Subject to change
 */
export const DEBT_RECOVERY_PERCENTAGE = 15;

// ---------------------------------------------------------------------------
// Dispute Constants
// ---------------------------------------------------------------------------

/**
 * Number of business days the platform team has to resolve a dispute
 * before the system auto-resolves in the customer's favour.
 */
export const DISPUTE_RESOLUTION_BUSINESS_DAYS = 5;

/**
 * How long after delivery a customer can still open a dispute.
 */
export const DISPUTE_WINDOW_HOURS_AFTER_DELIVERY = 72;

/**
 * Number of hours the customer has to submit additional evidence
 * when a dispute is marked as inconclusive.
 */
export const ADDITIONAL_EVIDENCE_WINDOW_HOURS = 48;

/**
 * Minimum amount a vendor can withdraw in a single payout request.
 * Requests below this threshold are rejected.
 *
 * Current: ₦1,000 (100,000 Kobo)
 */
export const MINIMUM_PAYOUT_AMOUNT_KOBO = 100_000; // ₦1,000

/**
 * Withdrawal amount limits (stored in kobo to avoid floating point errors)
 * These values define the minimum and maximum amount a user can withdraw.
 */
export const WITHDRAWAL_LIMITS = {
  MINIMUM_WITHDRAWAL: 100000, // ₦1,000 in kobo
  MAXIMUM_WITHDRAWAL: 10000000, // ₦100,000 in kobo
} as const;

/**
 * Fee configuration for withdrawals.
 * - PROCESSING_FEE_RATE: percentage fee applied to withdrawal amount
 * - FIXED_FEE: flat fee added to every withdrawal (in kobo)
 */
export const WITHDRAWAL_FEES = {
  PROCESSING_FEE_RATE: 0.01, // 1% processing fee
  FIXED_FEE: 5000, // ₦50 fixed fee in kobo
} as const;

// ---------------------------------------------------------------------------
// Commission Constants
// ---------------------------------------------------------------------------

/**
 * Soraxi's tiered commission fee structure for transactions.
 * - ₦1 – ₦2,499 → 5% of transaction amount + ₦100 flat fee
 * - ₦2,500 – ₦4,999 → 5% of transaction amount only
 * - ₦5,000+ → 5% of transaction amount + ₦200 flat fee
 *
 * All amounts are in Kobo (1 Naira = 100 Kobo).
 */
export const COMMISSION_LOWER_THRESHOLD_KOBO = 250_000; // ₦2,500
export const COMMISSION_UPPER_THRESHOLD_KOBO = 500_000; // ₦5,000
export const COMMISSION_FLAT_FEE_LOW_KOBO = 10_000; // ₦100
export const COMMISSION_FLAT_FEE_HIGH_KOBO = 20_000; // ₦200
export const COMMISSION_FEE_PERCENTAGE = 5;

// ---------------------------------------------------------------------------
// Flutterwave Gateway Constants
// ---------------------------------------------------------------------------

/**
 * VAT rate Flutterwave charges on its transfer/app fees.
 *
 * Current: 7.5%
 */
export const FLUTTERWAVE_VAT_RATE = 0.075;

/**
 * Flutterwave's tiered transfer-charge schedule for payouts, in Kobo.
 * The fee for a given amount is the first tier whose `maxAmountKobo` the
 * amount does not exceed; amounts above the last tier use its `feeKobo`.
 */
export const FLUTTERWAVE_TRANSFER_FEE_TIERS = [
  { maxAmountKobo: 500_000, feeKobo: 1_000 }, // up to ₦5,000 → ₦10
  { maxAmountKobo: 5_000_000, feeKobo: 2_500 }, // up to ₦50,000 → ₦25
  { maxAmountKobo: Infinity, feeKobo: 5_000 }, // above ₦50,000 → ₦50
] as const;
