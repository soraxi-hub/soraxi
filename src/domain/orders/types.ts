import {
  DeliveryType,
  PaymentGateway,
  PaymentStatus,
  StatusHistory,
  CouponTypeEnum,
} from "@/enums";

/**
 * Domain-level types for the Order Builder pattern
 * These types represent the shape of data at various stages of order construction
 */

/**
 * Represents a product snapshot stored with an order for historical record
 * Contains frozen data about the product at purchase time
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
 * Represents a store snapshot stored with an order for historical record
 */
export interface StoreSnapshot {
  readonly _id: string;
  readonly name: string;
}

/**
 * Represents a single shipping method option for a store
 */
export interface ShippingMethod {
  readonly name: string;
  readonly price: number;
  readonly estimatedDeliveryDays?: string;
  readonly description?: string;
}

/**
 * Represents discount information applied to an order
 */
export interface DiscountInfo {
  readonly amount: number;
  readonly couponCode?: string;
  readonly type?: CouponTypeEnum;
  readonly description?: string;
}

/**
 * Represents user/customer information
 */
export interface CustomerInfo {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly phoneNumber: string;
}

/**
 * Represents shipping address information
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
 * Represents payment information for an order
 */
export interface PaymentInfo {
  readonly gateway: PaymentGateway;
  readonly status?: PaymentStatus;
  readonly method?: string;
}

/**
 * Represents a single product item in a cart/order context
 * Immutable data structure for product information
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
 * Represents a store's portion of an order with its products and shipping
 */
export interface SubOrderConfig {
  readonly storeId: string;
  readonly storeName: string;
  readonly products: readonly OrderProductItem[];
  readonly shippingMethod: ShippingMethod;
}

/**
 * Represents the complete configuration needed to build an order
 * This is the final validated state before persistence
 */
export interface OrderBuildConfig {
  readonly customer: CustomerInfo;
  readonly subOrders: readonly SubOrderConfig[];
  readonly shippingAddress: ShippingAddressInfo;
  readonly paymentInfo: PaymentInfo;
  readonly discount?: DiscountInfo;
  readonly couponCode?: string;
  readonly notes?: string;
  readonly idempotencyKey: string;
}

/**
 * Represents calculated totals for an order or sub-order
 */
export interface OrderTotals {
  readonly subtotal: number;
  readonly discount: number;
  readonly shipping: number;
  readonly total: number;
}

/**
 * Represents a status history entry
 */
export interface StatusHistoryEntry {
  readonly status: StatusHistory;
  readonly timestamp: Date;
  readonly notes?: string;
}
