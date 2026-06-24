/**
 * types.ts — Order Builder domain types
 *
 * Changes from previous version:
 *
 *  1. ISubOrderFinancials is now defined here (was previously only in @/types/order).
 *     The canonical source of truth for the financial snapshot shape lives here,
 *     and @/types/order re-exports it. This keeps the order domain self-contained.
 *
 *  2. SubOrderBuildResult is new. It is the output of OrderBuilder.build() for
 *     each sub-order: the original SubOrderConfig paired with its computed
 *     ISubOrderFinancials. Downstream services (e.g. the order-creation service)
 *     receive both pieces together and never have to recompute financials.
 *
 *  3. OrderBuildConfig.subOrders is now readonly SubOrderBuildResult[] instead
 *     of readonly SubOrderConfig[]. Everything else in OrderBuildConfig is
 *     unchanged.
 *
 * All other types are identical to the previous version.
 */

import {
  DeliveryType,
  PaymentGateway,
  PaymentStatus,
  StatusHistory,
  CouponTypeEnum,
} from "@/enums";

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Immutable financial snapshot for a single sub-order.
 *
 * Produced once by buildSubOrderFinancials() and stored verbatim in the
 * database. Nothing downstream should recompute these values.
 *
 * All monetary values are in kobo.
 */
export interface ISubOrderFinancials {
  /** Sum of (item.price × item.quantity) before any discount. */
  readonly subtotal: number;

  /**
   * The portion of the order-level discount allocated to this sub-order.
   * Absent when no coupon was applied.
   */
  readonly discount?: DiscountInfo;

  /**
   * subtotal − discount.amount (or subtotal when there is no discount).
   * This is the amount the commission is calculated against.
   */
  readonly amountPaid: number;

  /**
   * Soraxi platform commission breakdown.
   * percentage is always 5 (surfaced explicitly for auditability).
   * amount is the kobo value deducted from amountPaid.
   */
  readonly platformFee: {
    readonly percentage: number;
    readonly amount: number;
  };

  /**
   * amountPaid − platformFee.amount.
   * The kobo amount the vendor will receive at settlement.
   */
  readonly vendorSettlementAmount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-ORDER BUILD RESULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The output produced by OrderBuilder for each sub-order.
 *
 * Pairs the original validated input config with the computed financial
 * snapshot so that the order-creation service has everything it needs in
 * one place without recomputing anything.
 */
export interface SubOrderBuildResult {
  /** Original validated sub-order input (products, shipping, store info). */
  readonly config: SubOrderConfig;
  /** Computed, immutable financial snapshot for this sub-order. */
  readonly financials: ISubOrderFinancials;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT / STORE SNAPSHOTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a product snapshot stored with an order for historical record.
 * Contains frozen data about the product at purchase time.
 */
export interface ProductSnapshot {
  readonly _id: string;
  readonly name: string;
  readonly images: readonly string[];
  readonly quantity: number;
  readonly price: number;
  readonly category?: string;
  readonly subCategory?: string;
  readonly selectedSize?: {
    readonly size: string;
    readonly price: number;
  };
}

/**
 * Represents a store snapshot stored with an order for historical record.
 */
export interface StoreSnapshot {
  readonly _id: string;
  readonly name: string;
  readonly email?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIPPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a single shipping method option for a store.
 */
export interface ShippingMethod {
  readonly name: string;
  readonly price: number;
  readonly estimatedDeliveryDays?: string;
  readonly description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCOUNT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents discount information applied to an order or sub-order.
 */
export interface DiscountInfo {
  readonly amount: number;
  readonly couponCode?: string;
  readonly type?: CouponTypeEnum;
  readonly description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER / ADDRESS / PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents user/customer information.
 */
export interface CustomerInfo {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly phoneNumber: string;
}

/**
 * Represents shipping address information.
 */
export interface ShippingAddressInfo {
  readonly address: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly deliveryType: DeliveryType;
  readonly campusName?: string;
  readonly campusLocation?: string;
}

/**
 * Represents payment information for an order.
 */
export interface PaymentInfo {
  readonly gateway: PaymentGateway;
  readonly status?: PaymentStatus;
  readonly method?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER PRODUCT ITEM / SUB-ORDER CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents a single product item in a cart/order context.
 * Immutable data structure for product information.
 */
export interface OrderProductItem {
  readonly product: {
    readonly _id: string;
    readonly name: string;
    readonly images: string[];
    readonly price: number;
    readonly category?: string;
    readonly subCategory?: string;
  };
  readonly quantity: number;
  readonly selectedSize?: {
    readonly size: string;
    readonly price: number;
  };
}

/**
 * Represents a store's portion of an order with its products and shipping.
 * This is the pure input config — it carries no financial data.
 */
export interface SubOrderConfig {
  readonly storeId: string;
  readonly storeName: string;
  readonly products: readonly OrderProductItem[];
  readonly shippingMethod: ShippingMethod;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER BUILD CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents the complete configuration produced by OrderBuilder.build().
 * This is the final validated + financially-enriched state before persistence.
 *
 * Key change: subOrders is now SubOrderBuildResult[] — each entry carries
 * both the raw config and the pre-computed financial snapshot.
 */
export interface OrderBuildConfig {
  readonly customer: CustomerInfo;
  /** Each entry pairs the validated sub-order config with its financials. */
  readonly subOrders: readonly SubOrderBuildResult[];
  readonly shippingAddress: ShippingAddressInfo;
  readonly paymentInfo: PaymentInfo;
  readonly discount?: DiscountInfo;
  readonly couponCode?: string;
  readonly notes?: string;
  readonly idempotencyKey: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER TOTALS / STATUS HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents calculated totals for an order or sub-order.
 */
export interface OrderTotals {
  readonly subtotal: number;
  readonly discount: number;
  readonly shipping: number;
  readonly total: number;
}

/**
 * Represents a status history entry.
 */
export interface StatusHistoryEntry {
  readonly status: StatusHistory;
  readonly timestamp: Date;
  readonly notes?: string;
}
