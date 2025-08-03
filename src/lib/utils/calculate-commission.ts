import { currencyOperations } from "./naira";

/**
 * Calculates transaction commission and settlement amount based on Soraxi's fee structure.
 *
 * This function implements the following fee structure:
 * - Base fee: 10% of transaction amount
 * - Flat fee: ₦200 (20000 kobo) for transactions ≥ ₦2500 (250000 kobo)
 * - Maximum fee cap: ₦3000 (300000 kobo)
 *
 * All monetary values are in kobo (1 Naira = 100 kobo) to avoid floating-point errors.
 *
 * @param amountInKobo - The transaction amount in kobo
 * @returns An object containing the commission amount and settlement amount in kobo
 */
export const calculateCommission = (amountInKobo: number) => {
  // Fee constants (converted to kobo)
  const FEE_PERCENTAGE = 10 / 100;
  const FLAT_FEE_KOBO = 20000; // ₦200 in kobo
  //   const FEE_CAP_KOBO = 300000; // ₦3000 in kobo
  const FLAT_FEE_THRESHOLD_KOBO = 250000; // ₦2500 in kobo

  // Calculate the percentage-based fee component
  const percentageFee = currencyOperations.percentage(
    amountInKobo,
    FEE_PERCENTAGE
  );

  // Determine if the flat fee should be applied
  // The flat fee is waived for transactions less than ₦2500 (250000 kobo)
  const shouldApplyFlatFee = amountInKobo >= FLAT_FEE_THRESHOLD_KOBO;

  // Calculate the total transaction fee (percentage fee + flat fee if applicable)
  const transactionFee = shouldApplyFlatFee
    ? currencyOperations.add(percentageFee, FLAT_FEE_KOBO)
    : percentageFee;

  // Apply the fee cap - commission cannot exceed ₦3000 (300000 kobo)
  //   const commission = Math.min(transactionFee, FEE_CAP_KOBO);
  const commission = transactionFee;

  // Calculate the final settlement amount (original amount minus commission)
  const settleAmount = amountInKobo - commission;

  return {
    commission,
    settleAmount,
    // Include additional details for transparency and debugging
    details: {
      percentageFee,
      flatFeeApplied: shouldApplyFlatFee ? FLAT_FEE_KOBO : 0,
      //   feeCapApplied: transactionFee > FEE_CAP_KOBO,
    },
  };
};
