import { DeliveryType } from "@/enums";
import { DiscountType } from "@/validators/discount-validation";

/**
 * Represents the delivery address and location details
 * provided by the customer for an order.
 */
export interface ShippingAddress {
  /**
   * The full delivery address or street location.
   */
  address: string;

  /**
   * The city where the order should be delivered.
   */
  city: string;

  /**
   * The state where the delivery destination is located.
   */
  state: string;

  /**
   * The postal or ZIP code associated with the delivery location.
   */
  postalCode: string;

  /**
   * Specifies the delivery method selected by the customer
   */
  deliveryType: DeliveryType;

  /**
   * The name of the campus where the order should be delivered,
   * applicable only for campus deliveries.
   */
  campusName?: string;

  /**
   * The specific location or landmark within the campus where
   * the order should be delivered.
   */
  campusLocation?: string;
}

/**
 * Tracks whether a customer has confirmed that a sub-order
 * was successfully delivered.
 */
export interface CustomerConfirmedDelivery {
  /**
   * Indicates whether the customer manually confirmed receiving the order.
   */
  confirmed: boolean;

  /**
   * The date and time when the customer confirmed delivery.
   */
  confirmedAt?: Date;

  /**
   * Indicates whether the system automatically marked the order
   * as delivered after the confirmation period elapsed.
   */
  autoConfirmed: boolean;
}

/**
 * Represents an immutable financial snapshot of a sub-order
 * at the time of purchase. It records the amount paid by the
 * customer, discounts applied, platform earnings, and the
 * final amount owed to the vendor.
 *
 * All monetary values are stored in kobo to prevent
 * floating-point precision errors.
 */
export interface ISubOrderFinancials {
  /**
   * The total value of all products before any discounts
   * or platform deductions are applied.
   */
  subtotal: number;

  /**
   * Details of any discount or coupon applied to the sub-order.
   */
  discount?: DiscountType;

  /**
   * The final amount paid by the customer after discounts
   * have been applied.
   */
  amountPaid: number;

  /**
   * The commission retained by the platform from this sub-order.
   * Stores both the calculated amount and the percentage used
   * at the time the order was placed.
   */
  platformFee: {
    /**
     * The commission rate applied by the platform at the time
     * of the transaction.
     */
    percentage: number;

    /**
     * The monetary amount deducted by the platform as commission.
     */
    amount: number;
  };

  /**
   * The amount that is owed to the vendor after deducting
   * the platform commission.
   */
  vendorSettlementAmount: number;
}
