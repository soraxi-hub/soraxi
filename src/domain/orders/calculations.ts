import { CouponTypeEnum } from "@/enums";
import {
  TotalCalculationError,
  InvalidDiscountError,
} from "./errors";
import type { OrderTotals } from "./types";

/**
 * Order calculation utilities for monetary operations
 * All values are in kobo (smallest currency unit) to avoid floating-point errors
 *
 * @remarks
 * This utility ensures consistent, reliable monetary calculations across the system.
 * Always use these utilities for any price, discount, or total calculations.
 */
export class OrderCalculations {
  /**
   * Calculates the total for a set of products with quantities
   * @param items - Array of items with price and quantity
   * @returns Total amount in kobo
   * @throws {TotalCalculationError} if calculation fails
   *
   * @example
   * const total = OrderCalculations.calculateProductsTotal([
   *   { price: 10000, quantity: 2 },
   *   { price: 5000, quantity: 1 }
   * ]);
   * // Returns 25000 (kobo)
   */
  static calculateProductsTotal(
    items: Array<{ price: number; quantity: number }>,
  ): number {
    try {
      return items.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        return sum + itemTotal;
      }, 0);
    } catch (error) {
      throw new TotalCalculationError(
        "Failed to calculate products total: " + String(error),
      );
    }
  }

  /**
   * Calculates discount amount based on type (percentage or fixed)
   * @param subtotal - Order subtotal in kobo
   * @param type - Discount type (percentage or fixed)
   * @param value - Discount value (percentage number or fixed amount in kobo)
   * @returns Discount amount in kobo
   * @throws {InvalidDiscountError} if discount is invalid
   *
   * @example
   * // 10% discount on 100000 kobo
   * const discount = OrderCalculations.calculateDiscount(100000, 'percentage', 10);
   * // Returns 10000
   *
   * @example
   * // Fixed 5000 kobo discount
   * const discount = OrderCalculations.calculateDiscount(100000, 'fixed', 5000);
   * // Returns 5000
   */
  static calculateDiscount(
    subtotal: number,
    type: CouponTypeEnum,
    value: number,
  ): number {
    try {
      let discountAmount = 0;

      if (type === CouponTypeEnum.Percentage) {
        if (value < 0 || value > 100) {
          throw new InvalidDiscountError(
            "Percentage discount must be between 0 and 100",
          );
        }
        discountAmount = Math.floor((subtotal * value) / 100);
      } else if (type === CouponTypeEnum.Fixed) {
        discountAmount = value;
      } else {
        throw new InvalidDiscountError(`Unknown discount type: ${type}`);
      }

      // Validate discount doesn't exceed subtotal
      if (discountAmount > subtotal) {
        throw new InvalidDiscountError(
          "Discount amount cannot exceed order subtotal",
        );
      }

      // Validate result is non-negative
      if (discountAmount < 0) {
        throw new InvalidDiscountError("Discount amount cannot be negative");
      }

      return discountAmount;
    } catch (error) {
      if (error instanceof InvalidDiscountError) {
        throw error;
      }
      throw new TotalCalculationError(
        "Failed to calculate discount: " + String(error),
      );
    }
  }

  /**
   * Distributes a discount proportionally across multiple items by amount
   * @param totalDiscount - Total discount to distribute in kobo
   * @param amounts - Array of amounts to distribute across
   * @returns Array of discount amounts corresponding to each item
   * @throws {TotalCalculationError} if distribution fails
   *
   * @example
   * const distribution = OrderCalculations.distributeDiscount(10000, [50000, 50000]);
   * // Returns [5000, 5000]
   *
   * @remarks
   * This uses proportional distribution with remainder handling to ensure
   * the sum of distributed amounts equals the total discount.
   */
  static distributeDiscount(totalDiscount: number, amounts: number[]): number[] {
    try {
      if (amounts.length === 0) {
        return [];
      }

      const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);

      if (totalAmount === 0) {
        throw new TotalCalculationError(
          "Cannot distribute discount across zero amounts",
        );
      }

      // Calculate proportional distribution
      const distribution = amounts.map((amount) => {
        return Math.floor((totalDiscount * amount) / totalAmount);
      });

      // Handle remainder to ensure sum equals totalDiscount
      let remainder = totalDiscount - distribution.reduce((sum, d) => sum + d, 0);
      for (let i = 0; i < distribution.length && remainder > 0; i++) {
        distribution[i]++;
        remainder--;
      }

      return distribution;
    } catch (error) {
      if (error instanceof TotalCalculationError) {
        throw error;
      }
      throw new TotalCalculationError(
        "Failed to distribute discount: " + String(error),
      );
    }
  }

  /**
   * Calculates final order totals including shipping and discount
   * @param subtotal - Order subtotal in kobo
   * @param shippingTotal - Total shipping cost in kobo
   * @param discount - Discount amount in kobo (optional)
   * @returns OrderTotals object with breakdown
   * @throws {TotalCalculationError} if calculation fails
   *
   * @example
   * const totals = OrderCalculations.calculateOrderTotals(100000, 5000, 10000);
   * // Returns { subtotal: 100000, discount: 10000, shipping: 5000, total: 95000 }
   *
   * @remarks
   * Ensures that:
   * - Discount is applied before calculating final total
   * - Final total cannot be negative
   * - All values are integers (no floating point)
   */
  static calculateOrderTotals(
    subtotal: number,
    shippingTotal: number = 0,
    discount: number = 0,
  ): OrderTotals {
    try {
      // Validate inputs
      if (subtotal < 0 || shippingTotal < 0 || discount < 0) {
        throw new TotalCalculationError(
          "Subtotal, shipping, and discount cannot be negative",
        );
      }

      if (discount > subtotal) {
        throw new InvalidDiscountError(
          "Discount cannot exceed subtotal",
        );
      }

      const total = subtotal - discount + shippingTotal;

      if (total < 0) {
        throw new TotalCalculationError(
          "Order total cannot be negative",
        );
      }

      return {
        subtotal,
        discount,
        shipping: shippingTotal,
        total,
      };
    } catch (error) {
      if (error instanceof (InvalidDiscountError || TotalCalculationError)) {
        throw error;
      }
      throw new TotalCalculationError(
        "Failed to calculate order totals: " + String(error),
      );
    }
  }

  /**
   * Validates that a total matches expected sum of component parts
   * Useful for verifying sub-order totals match product totals
   * @param expectedTotal - The expected total in kobo
   * @param actualTotal - The actual calculated total in kobo
   * @param tolerance - Allowed difference in kobo (default: 0)
   * @throws {TotalCalculationError} if totals don't match within tolerance
   *
   * @example
   * OrderCalculations.validateTotal(100000, 100000); // passes
   * OrderCalculations.validateTotal(100000, 99999, 1); // passes with tolerance
   * OrderCalculations.validateTotal(100000, 99998, 1); // throws
   */
  static validateTotal(
    expectedTotal: number,
    actualTotal: number,
    tolerance: number = 0,
  ): void {
    const difference = Math.abs(expectedTotal - actualTotal);
    if (difference > tolerance) {
      throw new TotalCalculationError(
        `Total mismatch: expected ${expectedTotal} but got ${actualTotal} (difference: ${difference})`,
      );
    }
  }

  /**
   * Checks if an amount is positive (greater than zero)
   * Useful for validation before operations
   * @param amount - Amount to check in kobo
   * @param fieldName - Name of the field being checked (for error messages)
   * @throws {TotalCalculationError} if amount is not positive
   */
  static validatePositiveAmount(amount: number, fieldName: string = "Amount"): void {
    if (amount <= 0) {
      throw new TotalCalculationError(
        `${fieldName} must be positive, got ${amount}`,
      );
    }
  }
}
