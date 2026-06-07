import { WITHDRAWAL_FEES } from "@/constants/financial.constants";
import { DebtRecoveryType } from "@/enums/financial.enums";

/**
 * Calculates all fees associated with a withdrawal transaction.
 *
 * This includes:
 * - Percentage-based processing fee
 * - Fixed fee
 * - Total fees
 * - Net amount the user will receive after deductions
 *
 * All calculations are done in kobo to ensure precision and avoid floating point errors.
 *
 * @param amountInKobo - The total withdrawal amount in kobo
 * @returns Breakdown of fees and final payout amount
 */
export function calculateWithdrawalFees(amountInKobo: number) {
  // Calculate percentage-based fee (1.5% of withdrawal amount)
  const percentageFee = Math.round(
    amountInKobo * WITHDRAWAL_FEES.PROCESSING_FEE_RATE,
  );

  // Fixed fee applied to every withdrawal
  const fixedFee = WITHDRAWAL_FEES.FIXED_FEE;

  // Total fees deducted from withdrawal
  const totalFee = percentageFee + fixedFee;

  // Final amount user receives after all deductions
  const netAmount = amountInKobo - totalFee;

  return {
    percentageFee,
    fixedFee,
    totalFee,
    netAmount,
  };
}

/**
 * Calculates how much debt should be recovered from a withdrawal request.
 *
 * If the vendor is on percentage-based debt recovery, a percentage of the
 * requested withdrawal amount is withheld and applied toward outstanding debt.
 *
 * The recovery amount can never exceed the vendor's remaining debt balance.
 *
 * Example:
 * Requested Amount: ₦10,000 (1,000,000 Kobo)
 * Debt Recovery Percentage: 15%
 * Outstanding Debt: ₦5,000
 *
 * Result:
 * - Recovery Deduction: ₦1,500
 * - Net Payout Amount: ₦8,500
 *
 * @param params.amount - Requested withdrawal amount in Kobo.
 * @param params.outstandingDebt - Vendor's current outstanding debt in Kobo.
 * @param params.recoveryType - Debt recovery strategy configured for the vendor.
 * @param params.recoveryPercentage - Percentage of each withdrawal to recover.
 *
 * @returns Recovery deduction and net payout amount.
 */
export const calculateDebtRecoveryDeduction = ({
  amount,
  outstandingDebt,
  recoveryType,
  recoveryPercentage,
}: {
  amount: number;
  outstandingDebt: number;
  recoveryType: DebtRecoveryType;
  recoveryPercentage: number;
}) => {
  const hasPercentageDebt =
    recoveryType === DebtRecoveryType.PERCENTAGE_DEDUCTION &&
    outstandingDebt > 0;

  const recoveryDeduction = hasPercentageDebt
    ? Math.min(Math.floor((amount * recoveryPercentage) / 100), outstandingDebt)
    : 0;

  return {
    recoveryDeduction,
    netPayoutAmount: amount - recoveryDeduction,
  };
};

/**
 * Calculates Flutterwave transfer charges.
 *
 * All amounts are in Kobo.
 */
export const calculateGatewayFee = (amount: number) => {
  let transferFee = 0;

  if (amount <= 500_000) {
    // ₦5,000
    transferFee = 1_000;
  } else if (amount <= 5_000_000) {
    // ₦50,000
    transferFee = 2_500;
  } else {
    transferFee = 5_000;
  }

  const vat = Math.round(transferFee * 0.075);

  return {
    transferFee,
    vat,
    total: transferFee + vat,
  };
};
