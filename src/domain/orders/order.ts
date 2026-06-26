import { IOrder } from "@/lib/db/models/order.model";
import { DeliveryStatus, PaymentStatus, StatusHistory } from "@/enums";
import {
  IOrderInfo,
  ISubOrderFinancialsFormatted,
  ISubOrderInfo,
  OrderAdminJSON,
  OrderPublicJSON,
  OrderStoreJSON,
} from "./interfaces/order.interface";
import { formatNaira, koboToNaira } from "@/lib/utils/naira";
import { ISubOrderFinancials } from "@/types/order";
import { CustomerInfo } from "./types";

/**
 * Order Aggregate Root
 *
 * Enforces:
 * - payment lifecycle rules
 * - delivery state transitions
 * - financial integrity
 * - sub-order isolation
 */
export class Order implements IOrderInfo {
  constructor(protected props: IOrder) {}

  // -------------------------------------------------------------------------
  // IDENTIFIERS
  // -------------------------------------------------------------------------

  get orderId(): string {
    return this.props._id.toString();
  }

  get userId(): string {
    return this.props.userId.toString();
  }

  get storeIds(): string[] {
    return this.props.stores.map((s) => s.toString());
  }

  get subOrders(): ISubOrderInfo[] {
    return this.props.subOrders.map((sub) => ({
      ...sub,
      storeId: sub.storeId.toString(),
      financials: this.formatSubOrderFinancials(sub.financials),
    }));
  }

  // -------------------------------------------------------------------------
  // PAYMENT STATE
  // -------------------------------------------------------------------------

  get paymentMethod(): string {
    return this.props.paymentMethod ?? "N/R";
  }

  get paymentStatus(): PaymentStatus {
    return this.props.paymentStatus;
  }

  get isPaid(): boolean {
    return this.props.paymentStatus === PaymentStatus.Paid;
  }

  get isPendingPayment(): boolean {
    return this.props.paymentStatus === PaymentStatus.Pending;
  }

  get isFailedPayment(): boolean {
    return this.props.paymentStatus === PaymentStatus.Failed;
  }

  // -------------------------------------------------------------------------
  // FINANCIALS — value pairs (kobo / naira / formatted)
  // -------------------------------------------------------------------------

  /** Raw kobo total charged to the customer. */
  get totalAmount(): number {
    return this.props.totalAmount;
  }

  /** Naira equivalent of totalAmount. */
  get totalAmountInNaira(): number {
    return koboToNaira(this.props.totalAmount);
  }

  /** Display-ready total amount. Example: ₦5,000 */
  get formattedTotalAmount(): string {
    return formatNaira(this.props.totalAmount);
  }

  // ----- discount -----

  /** Raw kobo discount applied to the order (0 if none). */
  get discountAmount(): number {
    return this.props.discount?.amount ?? 0;
  }

  /** Naira equivalent of discountAmount. */
  get discountAmountInNaira(): number {
    return koboToNaira(this.discountAmount);
  }

  /** Display-ready discount amount. Example: ₦500 */
  get formattedDiscountAmount(): string {
    return formatNaira(this.discountAmount);
  }

  get hasDiscount(): boolean {
    return !!this.props.discount;
  }

  // ----- totalVendorSettlement -----

  /** Raw kobo sum of all vendor settlement amounts across sub-orders. */
  get totalVendorSettlement(): number {
    return this.props.subOrders.reduce(
      (sum, sub) => sum + sub.financials.vendorSettlementAmount,
      0,
    );
  }

  /** Naira equivalent of totalVendorSettlement. */
  get totalVendorSettlementInNaira(): number {
    return koboToNaira(this.totalVendorSettlement);
  }

  /** Display-ready total vendor settlement. Example: ₦4,500 */
  get formattedTotalVendorSettlement(): string {
    return formatNaira(this.totalVendorSettlement);
  }

  // -------------------------------------------------------------------------
  // DELIVERY STATE
  // -------------------------------------------------------------------------

  get isFullyDelivered(): boolean {
    return this.props.subOrders.every(
      (s) => s.deliveryStatus === DeliveryStatus.Delivered,
    );
  }

  get hasPendingDelivery(): boolean {
    return this.props.subOrders.some(
      (s) => s.deliveryStatus !== DeliveryStatus.Delivered,
    );
  }

  // -------------------------------------------------------------------------
  // ITEMS
  // -------------------------------------------------------------------------

  get userSnapshot(): Omit<CustomerInfo, "userId"> {
    return this.props.userSnapshot;
  }

  get totalItems(): number {
    return this.props.subOrders.reduce((sum, sub) => {
      return (
        sum +
        sub.products.reduce((pSum, p) => {
          return pSum + (p.productSnapshot.quantity ?? 0);
        }, 0)
      );
    }, 0);
  }

  get isMultiStore(): boolean {
    return this.props.stores.length > 1;
  }

  get shippingAddress() {
    return this.props.shippingAddress;
  }

  get couponCode(): string | undefined {
    return this.props.couponCode;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // -------------------------------------------------------------------------
  // FINANCIAL HELPER — sub-order financials formatter
  // -------------------------------------------------------------------------

  /**
   * Converts a raw ISubOrderFinancials (kobo) into a fully-formatted
   * ISubOrderFinancialsFormatted with kobo, naira, and display values
   * for every monetary field.
   *
   * Called internally wherever sub-orders are projected — keeps the
   * formatting logic in one place (DRY, single responsibility).
   */
  protected formatSubOrderFinancials(
    fin: ISubOrderFinancials,
  ): ISubOrderFinancialsFormatted {
    return {
      // subtotal
      subtotal: fin.subtotal,
      subtotalInNaira: koboToNaira(fin.subtotal),
      formattedSubtotal: formatNaira(fin.subtotal),

      // discount (pass through the rest of the object, extend with formatted amounts)
      discount: fin.discount
        ? {
            ...fin.discount,
            amountInNaira: koboToNaira(fin.discount.amount),
            formattedAmount: formatNaira(fin.discount.amount),
          }
        : undefined,

      // amountPaid
      amountPaid: fin.amountPaid,
      amountPaidInNaira: koboToNaira(fin.amountPaid),
      formattedAmountPaid: formatNaira(fin.amountPaid),

      // platformFee
      platformFee: {
        percentage: fin.platformFee.percentage,
        amount: fin.platformFee.amount,
        amountInNaira: koboToNaira(fin.platformFee.amount),
        formattedAmount: formatNaira(fin.platformFee.amount),
      },

      // vendorSettlementAmount
      vendorSettlementAmount: fin.vendorSettlementAmount,
      vendorSettlementAmountInNaira: koboToNaira(fin.vendorSettlementAmount),
      formattedVendorSettlementAmount: formatNaira(fin.vendorSettlementAmount),
    };
  }

  // -------------------------------------------------------------------------
  // INVARIANT GUARDS
  // -------------------------------------------------------------------------

  assertCanModify() {
    if (this.isPaid && this.isFullyDelivered) {
      throw new Error("Completed orders cannot be modified");
    }
  }

  private assertCanMarkPaid() {
    if (this.isPaid) {
      throw new Error("Order is already paid");
    }
  }

  private assertCanFailPayment() {
    if (this.isPaid) {
      throw new Error("Cannot fail a paid order");
    }
  }

  // -------------------------------------------------------------------------
  // PAYMENT STATE TRANSITIONS
  // -------------------------------------------------------------------------

  markPaymentPaid() {
    this.assertCanMarkPaid();
    this.props.paymentStatus = PaymentStatus.Paid;
  }

  markPaymentFailed() {
    this.assertCanFailPayment();
    this.props.paymentStatus = PaymentStatus.Failed;
  }

  // -------------------------------------------------------------------------
  // ❌ ORDER CANCELLATION RULES
  // -------------------------------------------------------------------------

  cancelOrder(_reason?: string) {
    if (this.isPaid && this.isFullyDelivered) {
      throw new Error("Cannot cancel completed order");
    }
    this.props.paymentStatus = PaymentStatus.Cancelled;
  }

  // -------------------------------------------------------------------------
  // DELIVERY STATE MACHINE
  // -------------------------------------------------------------------------

  private canTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
    const map: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.OrderPlaced]: [
        DeliveryStatus.Processing,
        DeliveryStatus.Canceled,
      ],
      [DeliveryStatus.Processing]: [
        DeliveryStatus.Shipped,
        DeliveryStatus.Canceled,
      ],
      [DeliveryStatus.Shipped]: [
        DeliveryStatus.OutForDelivery,
        DeliveryStatus.Delivered,
        DeliveryStatus.Returned,
      ],
      [DeliveryStatus.OutForDelivery]: [
        DeliveryStatus.Delivered,
        DeliveryStatus.FailedDelivery,
      ],
      [DeliveryStatus.Delivered]: [],
      [DeliveryStatus.Canceled]: [],
      [DeliveryStatus.Returned]: [],
      [DeliveryStatus.FailedDelivery]: [],
      [DeliveryStatus.Refunded]: [],
    };

    return map[from]?.includes(to);
  }

  updateSubOrderStatus(
    storeId: string,
    status: DeliveryStatus,
    notes?: string,
  ) {
    this.assertCanModify();
    this.assertPaidRequiredForFulfillment(status);

    const subOrder = this.props.subOrders.find(
      (s) => s.storeId.toString() === storeId,
    );

    if (!subOrder) throw new Error("Sub-order not found");

    if (!this.canTransition(subOrder.deliveryStatus, status)) {
      throw new Error(
        `Invalid transition: ${subOrder.deliveryStatus} → ${status}`,
      );
    }

    if (
      !Object.values(StatusHistory).includes(status as unknown as StatusHistory)
    ) {
      throw new Error(`Cannot update status: ${status}`);
    }

    const now = new Date();
    subOrder.deliveryStatus = status;

    if (status === DeliveryStatus.Delivered) {
      subOrder.deliveryDate = now;
    }

    subOrder.statusHistory.push({
      status: status as unknown as StatusHistory,
      timestamp: now,
      notes,
    });
  }

  // -------------------------------------------------------------------------
  // PAYMENT REQUIRED RULE
  // -------------------------------------------------------------------------

  private assertPaidRequiredForFulfillment(status: DeliveryStatus) {
    const requiresPayment = [
      DeliveryStatus.Processing,
      DeliveryStatus.Shipped,
      DeliveryStatus.OutForDelivery,
      DeliveryStatus.Delivered,
    ];

    if (requiresPayment.includes(status) && !this.isPaid) {
      throw new Error("Order must be paid before fulfillment");
    }
  }

  // -------------------------------------------------------------------------
  // CUSTOMER DELIVERY CONFIRMATION
  // -------------------------------------------------------------------------

  confirmDelivery(storeId: string) {
    const sub = this.props.subOrders.find(
      (s) => s.storeId.toString() === storeId,
    );

    if (!sub) throw new Error("Sub-order not found");

    if (sub.deliveryStatus !== DeliveryStatus.Delivered) {
      throw new Error("Cannot confirm undelivered order");
    }

    sub.customerConfirmedDelivery = {
      confirmed: true,
      confirmedAt: new Date(),
      autoConfirmed: false,
    };
  }

  // -------------------------------------------------------------------------
  // DTOs
  // -------------------------------------------------------------------------

  /**
   * Customer-facing view.
   * Sub-orders are intentionally omitted — customers see the order as a
   * whole, not the internal vendor split.
   */
  toJSON(): OrderPublicJSON {
    return {
      orderId: this.orderId,
      userId: this.userId,
      stores: this.storeIds,
      subOrders: this.subOrders,
      customerInfo: this.userSnapshot,
      totalAmount: this.totalAmount,
      totalAmountInNaira: this.totalAmountInNaira,
      formattedTotalAmount: this.formattedTotalAmount,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      isPaid: this.isPaid,

      shippingAddress: this.shippingAddress,

      couponCode: this.couponCode,
      hasDiscount: this.hasDiscount,

      discountAmount: this.discountAmount,
      discountAmountInNaira: this.discountAmountInNaira,
      formattedDiscountAmount: this.formattedDiscountAmount,

      totalItems: this.totalItems,
      isMultiStore: this.isMultiStore,

      isFullyDelivered: this.isFullyDelivered,

      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Store-scoped view of an order.
   *
   * IMPORTANT:
   * - Only returns the sub-order belonging to the given store.
   * - Totals are recalculated from store-specific data.
   * - financials on the sub-order are fully formatted.
   */
  toStoreJSON(storeId: string): OrderStoreJSON {
    const subOrder = this.props.subOrders.find(
      (s) => s.storeId.toString() === storeId,
    );

    if (!subOrder) {
      throw new Error("Sub-order not found for this store");
    }

    const storeTotalItems = subOrder.products.reduce(
      (sum, p) => sum + (p.productSnapshot.quantity ?? 0),
      0,
    );

    const formattedFinancials = this.formatSubOrderFinancials(
      subOrder.financials,
    );

    const storeTotalAmount = subOrder.financials.vendorSettlementAmount;

    return {
      orderId: this.orderId,
      storeId,
      customerInfo: this.userSnapshot,
      subOrder: {
        ...subOrder,
        storeId: subOrder.storeId.toString(),
        financials: formattedFinancials,
      },
      shippingAddress: this.shippingAddress,
      paymentStatus: this.paymentStatus,
      paymentMethod: this.paymentMethod,
      totalAmount: storeTotalAmount,
      totalAmountInNaira: koboToNaira(storeTotalAmount),
      formattedTotalAmount: formatNaira(storeTotalAmount),

      totalItems: storeTotalItems,

      isFullyDelivered: subOrder.deliveryStatus === DeliveryStatus.Delivered,

      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Admin view — full financials, all sub-orders, formatted throughout.
   */
  toAdminJSON(): OrderAdminJSON {
    return {
      ...this.toJSON(),

      totalVendorSettlement: this.totalVendorSettlement,
      totalVendorSettlementInNaira: this.totalVendorSettlementInNaira,
      formattedTotalVendorSettlement: this.formattedTotalVendorSettlement,

      hasPendingDelivery: this.hasPendingDelivery,
    };
  }
}
