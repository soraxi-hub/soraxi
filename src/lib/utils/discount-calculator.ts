/**
 * DiscountCalculator Utility
 *
 * Handles discount calculation and distribution across multiple stores.
 * Supports fixed and percentage-based discounts.
 * Distributes discounts proportionally based on each store's order amount.
 */

import { CouponType, CouponTypeEnum } from "@/validators/coupon-validations";
import { currencyOperations } from "./naira";

interface CouponParams {
  type: CouponType["type"];
  value: CouponType["value"]; // It is in kobo.
}

export interface ProportionalDiscountBreakdown {
  distribution: number[];
  verificationTotal: number;
}

export class DiscountCalculator {
  /**
   * Computes the discount for an order based on the coupon type.
   * Safely caps the discount so it never exceeds the order total.
   *
   * @param coupon - Coupon configuration containing type and value (in kobo).
   * @param orderTotal - Total order amount before discount (in kobo).
   * @returns The final discount amount to apply (in kobo).
   */
  static calculateDiscount(coupon: CouponParams, orderTotal: number): number {
    if (coupon.type === CouponTypeEnum.Fixed) {
      return Math.min(orderTotal, coupon.value);
    }
    if (coupon.type === CouponTypeEnum.Percentage) {
      const discount = currencyOperations.roundDownPercentage(
        orderTotal,
        coupon.value
      );
      return Math.min(orderTotal, discount);
    }
    return 0;
  }

  /**
   * Distribute discount proportionally based on each store's order amount
   * This ensures fair distribution where larger orders get proportionally larger discounts
   * @param totalDiscount - Total discount amount to distribute
   * @param storeAmounts - Array of each store's order amount
   * @returns Array where each index represents discount for that store
   * @example
   * distributeDiscountProportionally(2000, [10000, 40000])
   * // Returns [400, 1600] - proportional to store amounts
   */
  static distributeDiscountProportionally(
    totalDiscount: number,
    storeAmounts: number[]
  ): ProportionalDiscountBreakdown {
    if (storeAmounts.length === 0 || totalDiscount === 0) {
      return { distribution: [], verificationTotal: 0 };
    }

    const grandTotal = storeAmounts.reduce((sum, amount) => sum + amount, 0);

    if (grandTotal === 0) {
      return {
        distribution: Array(storeAmounts.length).fill(0),
        verificationTotal: 0,
      };
    }

    // Calculate proportional discount for each store
    const discounts = storeAmounts.map((amount) => {
      return Math.round((amount / grandTotal) * totalDiscount);
    });

    // Handle rounding precision: ensure total matches exactly
    const discountSum = discounts.reduce((sum, d) => sum + d, 0);
    const difference = totalDiscount - discountSum;

    // Apply remainder to the store with the largest order to maintain accuracy
    if (difference !== 0) {
      const maxIndex = storeAmounts.indexOf(Math.max(...storeAmounts));
      discounts[maxIndex] += difference;
    }

    return {
      distribution: discounts,
      verificationTotal: discounts.reduce((sum, d) => sum + d, 0),
    };
  }

  /**
   * Verify discount distribution is correct
   * Useful for testing and validation
   * @param distribution - Array of discount amounts per store
   * @param expectedTotal - Expected total discount
   * @returns true if distribution sums to expected total
   */
  static verifyDistribution(
    distribution: number[],
    expectedTotal: number
  ): boolean {
    const total = distribution.reduce((sum, d) => sum + d, 0);
    return total === expectedTotal;
  }
}
