import { DeliveryStatus, PaymentStatus } from "@/enums";
import { ISubOrder } from "@/lib/db/models/order.model";
import { ISubOrderFinancials } from "@/types/order";
import { ShippingAddress } from "@/types/order";
import { CustomerInfo } from "../types";

// ---------------------------------------------------------------------------
// Formatted sub-order financials
// ---------------------------------------------------------------------------

/**
 * A formatted projection of ISubOrderFinancials where every monetary field
 * is surfaced in three forms:
 *   - raw kobo  (number)   — for backend arithmetic
 *   - naira     (number)   — e.g. 5000
 *   - formatted (string)   — e.g. ₦5,000
 *
 * The discount amount follows the same pattern; the rest of the discount
 * object is passed through untouched.
 */
export type ISubOrderFinancialsFormatted = {
  // ----- subtotal -----
  subtotal: number;
  subtotalInNaira: number;
  formattedSubtotal: string;

  // ----- discount -----
  discount?: ISubOrderFinancials["discount"] & {
    amountInNaira: number;
    formattedAmount: string;
  };

  // ----- amountPaid -----
  amountPaid: number;
  amountPaidInNaira: number;
  formattedAmountPaid: string;

  // ----- platformFee -----
  platformFee: {
    percentage: number;
    amount: number;
    amountInNaira: number;
    formattedAmount: string;
  };

  // ----- vendorSettlementAmount -----
  vendorSettlementAmount: number;
  vendorSettlementAmountInNaira: number;
  formattedVendorSettlementAmount: string;
};

// ---------------------------------------------------------------------------
// Sub-order info exposed by the aggregate
// ---------------------------------------------------------------------------

/**
 * Sub-order contract inside the Order aggregate.
 * financials is replaced with the fully-formatted variant.
 */
export type ISubOrderInfo = Omit<ISubOrder, "storeId" | "financials"> & {
  storeId: string;
  financials: ISubOrderFinancialsFormatted;
};

// ---------------------------------------------------------------------------
// Public contract for the Order aggregate root
// ---------------------------------------------------------------------------

/**
 * Public contract for Order aggregate root.
 */
export interface IOrderInfo {
  orderId: string;
  userId: string;
  storeIds: string[];

  subOrders: ISubOrderInfo[];

  // ----- totalAmount -----
  totalAmount: number;
  totalAmountInNaira: number;
  formattedTotalAmount: string;

  paymentStatus: PaymentStatus;
  isPaid: boolean;
  isPendingPayment: boolean;
  isFailedPayment: boolean;

  shippingAddress: ShippingAddress;

  couponCode?: string;
  hasDiscount: boolean;

  // ----- discountAmount -----
  discountAmount: number;
  discountAmountInNaira: number;
  formattedDiscountAmount: string;

  totalItems: number;

  isMultiStore: boolean;

  isFullyDelivered: boolean;
  hasPendingDelivery: boolean;

  // ----- totalVendorSettlement -----
  totalVendorSettlement: number;
  totalVendorSettlementInNaira: number;
  formattedTotalVendorSettlement: string;

  createdAt: Date;
  updatedAt: Date;

  /**
   * STATE TRANSITION METHODS (DOMAIN RULES)
   */
  markPaymentPaid(): void;
  markPaymentFailed(): void;
  cancelOrder(reason?: string): void;

  updateSubOrderStatus(
    storeId: string,
    status: DeliveryStatus,
    notes?: string,
  ): void;

  confirmDelivery(storeId: string): void;

  assertCanModify(): void;

  /**
   * DTOs
   */
  toJSON(): OrderPublicJSON;
  toAdminJSON(): OrderAdminJSON;
  toStoreJSON(storeId: string): OrderStoreJSON;
}

// ---------------------------------------------------------------------------
// JSON / DTO shapes
// ---------------------------------------------------------------------------

export type OrderPublicJSON = {
  orderId: string;
  userId: string;
  stores: string[];
  subOrders: ISubOrderInfo[];
  customerInfo: Omit<CustomerInfo, "userId">;
  totalAmount: number;
  totalAmountInNaira: number;
  formattedTotalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  isPaid: boolean;

  shippingAddress: ShippingAddress;

  couponCode?: string;
  hasDiscount: boolean;

  discountAmount: number;
  discountAmountInNaira: number;
  formattedDiscountAmount: string;

  totalItems: number;
  isMultiStore: boolean;

  isFullyDelivered: boolean;

  createdAt: Date;
  updatedAt: Date;
};

export type OrderStoreJSON = {
  orderId: string;
  storeId: string;
  customerInfo: Omit<CustomerInfo, "userId">;
  subOrder: ISubOrderInfo;
  shippingAddress: ShippingAddress;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  /** Store-scoped total = vendorSettlementAmount for this sub-order */
  totalAmount: number;
  totalAmountInNaira: number;
  formattedTotalAmount: string;

  totalItems: number;

  isFullyDelivered: boolean;

  createdAt: Date;
  updatedAt: Date;
};

export type OrderAdminJSON = OrderPublicJSON & {
  totalVendorSettlement: number;
  totalVendorSettlementInNaira: number;
  formattedTotalVendorSettlement: string;

  hasPendingDelivery: boolean;
};
