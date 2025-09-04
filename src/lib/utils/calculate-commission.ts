import { currencyOperations } from "./naira";

/**
 * Calculates transaction commission and settlement amount based on Soraxi's fee structure.
 *
 * Fee structure (all amounts are in Naira, converted to Kobo internally):
 * - ₦1 – ₦2,499 → 5% of transaction amount + ₦100 flat fee
 * - ₦2,500 – ₦4,999 → 5% of transaction amount only
 * - ₦5,000+ → 5% of transaction amount + ₦200 flat fee
 *
 * Notes:
 * - All monetary values are handled in Kobo (1 Naira = 100 Kobo)
 *   to avoid floating-point precision errors.
 *
 * @param amountInKobo - The transaction amount in Kobo
 * @returns An object containing the commission amount and settlement amount in Kobo
 */
export const calculateCommission = (amountInKobo: number) => {
  // Convert Naira thresholds and flat fees into Kobo for accuracy
  const LOWER_THRESHOLD_KOBO = 250000; // ₦2,500 in Kobo
  const UPPER_THRESHOLD_KOBO = 500000; // ₦5,000 in Kobo
  const FLAT_FEE_LOW_KOBO = 10000; // ₦100 in Kobo
  const FLAT_FEE_HIGH_KOBO = 20000; // ₦200 in Kobo

  // Commission percentage (5%)
  const FEE_PERCENTAGE = 5;

  // Calculate the percentage-based fee
  const percentageFee = currencyOperations.percentage(
    amountInKobo,
    FEE_PERCENTAGE
  );

  // Initialize commission with percentage fee
  let commission = percentageFee;
  let flatFeeApplied = 0;

  // Apply Soraxi’s tiered flat fee rules based on thresholds
  if (amountInKobo < LOWER_THRESHOLD_KOBO) {
    // Case 1: Transactions below ₦2,500 → 5% + ₦100 flat fee
    commission = currencyOperations.add(percentageFee, FLAT_FEE_LOW_KOBO);
    flatFeeApplied = FLAT_FEE_LOW_KOBO;
  } else if (amountInKobo >= UPPER_THRESHOLD_KOBO) {
    // Case 3: Transactions ₦5,000 and above → 5% + ₦200 flat fee
    commission = currencyOperations.add(percentageFee, FLAT_FEE_HIGH_KOBO);
    flatFeeApplied = FLAT_FEE_HIGH_KOBO;
  }
  // Case 2: Between ₦2,500 and ₦4,999 → 5% only (no flat fee)

  // Calculate the settlement amount (vendor receives this after commission deduction)
  const settleAmount = amountInKobo - commission;

  // Return detailed breakdown for transparency
  return {
    commission, // Total commission deducted in Kobo
    settleAmount, // Final settlement to vendor in Kobo
    details: {
      percentageFee, // The raw 5% fee portion
      flatFeeApplied, // The flat fee applied (0, ₦100, or ₦200 in Kobo)
    },
  };
};
