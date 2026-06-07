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
 * Current: 10% of gross amount
 */
export const PENALTY_BASE_PERCENTAGE = 10;

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
 * before the system auto-resolves in the student's favour.
 */
export const DISPUTE_RESOLUTION_BUSINESS_DAYS = 5;

/**
 * Number of hours the student has to submit additional evidence
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
