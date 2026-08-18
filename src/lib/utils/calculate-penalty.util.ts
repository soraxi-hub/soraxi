import {
  PENALTY_BASE_PERCENTAGE,
  PENALTY_CAP_KOBO,
} from "@/constants/financial.constants";
import { currencyOperations } from "@/lib/utils/naira";

/**
 * Result of a penalty calculation.
 */
export interface IPenaltyCalculation {
  penaltyAmount: number; // Final penalty in Kobo after cap is applied
  isCapped: boolean; // Whether the cap was applied
  details: {
    rawAmount: number; // Penalty before cap in Kobo
    capApplied: number; // The cap value in Kobo (for transparency)
    percentage: number; // The base percentage used
  };
}

/**
 * Calculates the penalty amount for an upheld dispute.
 *
 * Formula:
 *   penalty = PENALTY_BASE_PERCENTAGE% of gross suborder amount
 *   penalty = min(penalty, PENALTY_CAP_KOBO)
 *
 * Examples (at current 10% rate, ₦5,000 cap):
 *   grossAmount = ₦10,000 (1,000,000 Kobo) → penalty = ₦1,000 (100,000 Kobo) — not capped
 *   grossAmount = ₦80,000 (8,000,000 Kobo) → penalty = ₦5,000 (500,000 Kobo) — capped
 *   grossAmount = ₦2,000  (200,000 Kobo)   → penalty = ₦200  (20,000 Kobo)  — not capped
 *
 * @param grossAmountInKobo - The full gross amount of the disputed suborder in Kobo
 * @returns Penalty calculation result with full breakdown
 */
export function calculatePenalty(
  grossAmountInKobo: number,
): IPenaltyCalculation {
  // Calculate the raw percentage-based penalty
  const rawAmount = currencyOperations.percentage(
    grossAmountInKobo,
    PENALTY_BASE_PERCENTAGE,
  );

  // Apply the cap — penalty never exceeds PENALTY_CAP_KOBO
  const penaltyAmount = Math.min(rawAmount, PENALTY_CAP_KOBO);
  const isCapped = rawAmount > PENALTY_CAP_KOBO;

  return {
    penaltyAmount,
    isCapped,
    details: {
      rawAmount,
      capApplied: PENALTY_CAP_KOBO,
      percentage: PENALTY_BASE_PERCENTAGE,
    },
  };
}
