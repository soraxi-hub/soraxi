import { calculateCommission } from "@/lib/utils/calculate-commission";

export class CommissionService {
  /**
   * Determines the exact amount to be released to the seller after
   * platform commission deduction. The settlement amount plus shipping
   * costs (if applicable) will be credited to the seller's wallet.
   */
  calculateCommission(totalAmount: number) {
    return calculateCommission(totalAmount);
  }
}
