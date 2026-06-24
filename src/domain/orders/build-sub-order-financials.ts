/**
 * buildSubOrderFinancials
 *
 * The single authoritative composition point for all sub-order financial data.
 *
 * Responsibility:
 *   Given the raw inputs for one sub-order (items + its proportionally-allocated
 *   discount), produce a complete, immutable ISubOrderFinancials snapshot.
 *
 * What this function does NOT do:
 *   - It does NOT split a coupon across stores — that is the caller's job
 *     (OrderBuilder uses DiscountCalculator.distributeDiscountProportionally
 *     before calling this).
 *   - It does NOT recalculate commission rules — it delegates entirely to
 *     calculateCommission().
 *   - It does NOT recalculate subtotals — it delegates to
 *     OrderCalculations.calculateProductsTotal().
 *
 * All monetary values are in kobo.
 */

import { OrderCalculations } from "./calculations";
import { calculateCommission } from "@/lib/utils/calculate-commission";
import type { ISubOrderFinancials, DiscountInfo } from "./types";
import { InvalidSubOrderError } from "./errors";

/**
 * Minimal item shape required to compute a subtotal.
 * Matches the subset of OrderProductItem the calculation needs.
 */
export interface SubOrderItem {
  readonly product: {
    readonly price: number;
  };
  readonly quantity: number;
  readonly selectedSize?: {
    readonly price: number;
  };
}

/**
 * Inputs for building one sub-order's financial snapshot.
 *
 * @param items       - The products belonging to this sub-order.
 * @param discount    - The portion of the order-level discount already
 *                      allocated to this sub-order (in kobo). Pass undefined
 *                      or omit when there is no discount.
 */
export interface BuildSubOrderFinancialsInput {
  readonly items: readonly SubOrderItem[];
  readonly discount?: DiscountInfo;
}

/**
 * Builds and returns an immutable financial snapshot for a single sub-order.
 *
 * Financial flow:
 *
 *   subtotal       = sum(item.price * item.quantity)   [via OrderCalculations]
 *   discountAmount = discount.amount ?? 0
 *   amountPaid     = subtotal - discountAmount
 *   commission     = calculateCommission(amountPaid)   [Soraxi fee structure]
 *   platformFee    = { percentage: 5, amount: commission.commission }
 *   vendorSettlementAmount = commission.settleAmount
 *
 * @throws {InvalidSubOrderError} when items array is empty.
 * @throws {InvalidSubOrderError} when discount amount exceeds subtotal.
 */
export function buildSubOrderFinancials(
  input: BuildSubOrderFinancialsInput,
): Readonly<ISubOrderFinancials> {
  const { items, discount } = input;

  // ── 1. Guard ──────────────────────────────────────────────────────────────
  if (!items || items.length === 0) {
    throw new InvalidSubOrderError(
      "buildSubOrderFinancials: sub-order must have at least one item",
    );
  }

  // ── 2. Subtotal ───────────────────────────────────────────────────────────
  // Delegate entirely to OrderCalculations — no price logic here.
  const subtotal = OrderCalculations.calculateProductsTotal(
    items.map((item) => ({
      price: item.selectedSize?.price ?? item.product.price,
      quantity: item.quantity,
    })),
  );

  // ── 3. Discount ───────────────────────────────────────────────────────────
  const discountAmount = discount?.amount ?? 0;

  if (discountAmount > subtotal) {
    throw new InvalidSubOrderError(
      `buildSubOrderFinancials: discount (${discountAmount}) exceeds subtotal (${subtotal})`,
    );
  }

  // ── 4. Amount paid (what the vendor actually receives consideration for) ──
  const amountPaid = subtotal - discountAmount;

  // ── 5. Commission + settlement ────────────────────────────────────────────
  // Delegate entirely to calculateCommission — no fee logic here.
  const commissionResult = calculateCommission(amountPaid);

  // ── 6. Compose snapshot ───────────────────────────────────────────────────
  // Object.freeze enforces immutability at runtime, matching the intent of
  // "financial snapshots must not be mutated after creation".
  const financials: ISubOrderFinancials = Object.freeze({
    subtotal,
    ...(discount !== undefined ? { discount } : {}),
    amountPaid,
    platformFee: Object.freeze({
      // The percentage is fixed by Soraxi's fee structure; we surface it
      // explicitly so readers of stored data never have to reverse-engineer it.
      percentage: 5,
      amount: commissionResult.commission,
    }),
    vendorSettlementAmount: commissionResult.settleAmount,
  });

  return financials;
}
