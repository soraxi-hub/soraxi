import { IOrderService } from "../interfaces/order-service.interface";
import { OrderRepository } from "@/repositories/order.repository";
import { AppError } from "@/lib/errors/app-error";
import { Order } from "@/domain/orders/order";
import mongoose from "mongoose";
import { IOrder, IOrderDocument } from "@/lib/db/models/order.model";
import { FilterQuery } from "mongoose";
import { DeliveryStatus, PaymentStatus } from "@/enums";
import { OrderFactory } from "@/domain/orders/order-factory";
import { RefundService } from "@/services/refund.service";
import { getTransactionRecordModel } from "@/lib/db/models/transaction-record.model";
import {
  FlutterwavePaymentStatus,
  SuborderFinancialStatus,
} from "@/enums/financial.enums";

/**
 * OrderService
 *
 * Thin orchestration layer ONLY:
 * - delegates persistence to repository
 * - delegates business rules to Order aggregate
 * - enforces request-level validation
 * - keeps transaction boundaries explicit
 */
export class OrderService implements IOrderService {
  // ---------------------------------------------------------------------
  // READ OPERATIONS
  // ---------------------------------------------------------------------

  async getOrderUserView(orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError("BAD_REQUEST", "Invalid order ID format");
    }

    const orderDoc = await OrderRepository.getOrderById(orderId, true);

    if (!orderDoc) {
      throw new AppError("NOT_FOUND", "Order not found", { orderId });
    }

    return new Order(orderDoc).toJSON();
  }

  async getOrderStoreView(orderId: string, storeId: string) {
    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(storeId)
    ) {
      throw new AppError("BAD_REQUEST", "Invalid order ID or store ID format");
    }

    const orderDoc = await OrderRepository.getOrderById(orderId, true);

    if (!orderDoc) {
      throw new AppError("NOT_FOUND", "Order not found", { orderId });
    }

    return new Order(orderDoc).toStoreJSON(storeId);
  }

  async getOrdersByUser(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("BAD_REQUEST", "Invalid user ID format");
    }

    const orderDocs = await OrderRepository.getOrdersByUserId(userId);

    return orderDocs.map((order) => new Order(order).toJSON());
  }

  async getOrderForStore(orderId: string, storeId: string) {
    if (!orderId || !storeId) {
      throw new AppError("BAD_REQUEST", "OrderId and StoreId required");
    }

    const orderDoc = await OrderRepository.getOrderById(orderId);

    if (!orderDoc) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    return new Order(orderDoc).toStoreJSON(storeId);
  }

  async getStoreOrders(
    storeId: string,
    options: {
      startDate?: string;
      endDate?: string;
      deliveryStatus?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    // 1. Validate store ID
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      throw new AppError("BAD_REQUEST", "Invalid store ID format");
    }

    // 2. Set defaults & validate pagination
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // 3. Base match conditions for store-specific orders
    // Match store-specific orders where the "paymentStatus" is not "pending"
    const matchConditions: FilterQuery<IOrder> = {
      stores: new mongoose.Types.ObjectId(storeId),
      paymentStatus: { $ne: PaymentStatus.Pending }, // exclude pending payments
    };

    // Date range
    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      const end = new Date(options.endDate);
      if (start > end) {
        throw new AppError("BAD_REQUEST", "Start date must be before end date");
      }
      matchConditions.createdAt = { $gte: start, $lte: end };
    }

    // Delivery status
    if (options.deliveryStatus && options.deliveryStatus !== "all") {
      matchConditions["subOrders.deliveryStatus"] = options.deliveryStatus;
    }

    // 4. Delegate to repository (you'll need to add this method)
    const { orders: orderDocs, totalCount } =
      await OrderRepository.getStoreOrders(matchConditions, {
        skip,
        limit,
      });

    // 5. Format each order for the store
    const formattedOrders = orderDocs.map((doc) =>
      new Order(doc).toStoreJSON(storeId),
    );

    // 6. Build pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    return {
      orders: formattedOrders,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
      },
      filters: {
        dateRange:
          options.startDate && options.endDate
            ? { startDate: options.startDate, endDate: options.endDate }
            : null,
        deliveryStatus: options.deliveryStatus || "all",
      },
    };
  }

  async getOrdersAdminView(
    options: {
      startDate?: string;
      endDate?: string;
      deliveryStatus?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    // 1. Set defaults & validate pagination
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    // 3. Base match conditions for store-specific orders
    // Match store-specific orders where the "paymentStatus" is not "pending"
    const matchConditions: FilterQuery<IOrder> = {};

    // Date range
    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      const end = new Date(options.endDate);
      if (start > end) {
        throw new AppError("BAD_REQUEST", "Start date must be before end date");
      }
      matchConditions.createdAt = { $gte: start, $lte: end };
    }

    // Delivery status
    if (options.deliveryStatus && options.deliveryStatus !== "all") {
      matchConditions["subOrders.deliveryStatus"] = options.deliveryStatus;
    }

    // 4. Delegate to repository (you'll need to add this method)
    const { orders: orderDocs, totalCount } =
      await OrderRepository.getStoreOrders(matchConditions, {
        skip,
        limit,
      });

    // 5. Format each order for the store
    const formattedOrders = orderDocs.map((doc) =>
      new Order(doc).toAdminJSON(),
    );

    // 6. Build pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    return {
      orders: formattedOrders,
      pagination: {
        page,
        pages: totalPages,
        total: totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
      },
      filters: {
        fromDate: options.startDate ?? null,
        toDate: options.endDate ?? null,
        status: options.deliveryStatus || "all",
      },
    };
  }

  // ---------------------------------------------------------------------
  // PAYMENT FLOWS
  // ---------------------------------------------------------------------

  async markOrderPaid(orderId: string, session: mongoose.ClientSession) {
    const orderDoc = (await OrderRepository.getOrderById(
      orderId,
      true,
    )) as IOrderDocument | null;

    if (!orderDoc) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    const order = new Order(orderDoc);

    order.markPaymentPaid();

    await orderDoc.save({ session });

    return order.toJSON();
  }

  async markOrderPaymentFailed(
    orderId: string,
    session: mongoose.ClientSession,
  ) {
    const orderDoc = (await OrderRepository.getOrderById(
      orderId,
      true,
    )) as IOrderDocument | null;

    if (!orderDoc) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    const order = new Order(orderDoc);

    order.markPaymentFailed();

    await orderDoc.save({ session });

    return order.toJSON();
  }

  // ---------------------------------------------------------------------
  // DELIVERY FLOWS
  // ---------------------------------------------------------------------

  async updateDeliveryStatus(
    orderId: string,
    storeId: string,
    status: DeliveryStatus,
    notes: string | undefined,
    session: mongoose.ClientSession,
  ) {
    const orderDoc = (await OrderRepository.getOrderById(
      orderId,
    )) as IOrderDocument | null;

    if (!orderDoc) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    const order = OrderFactory.createOrder(orderDoc);

    order.updateSubOrderStatus(storeId, status, notes);

    // Financial side effect: a Canceled or FailedDelivery transition reverses
    // the vendor's pending funds and opens a customer refund. Runs on the SAME
    // session as the status change, so the two are atomic — we can never end up
    // with a cancelled suborder and no refund record, or vice versa. This may
    // throw (e.g. funds already SETTLED), which correctly aborts the whole
    // transition. No network call happens here; the RefundRecord is left
    // INITIATED for the admin to confirm (current manual mode).
    if (
      status === DeliveryStatus.Canceled ||
      status === DeliveryStatus.FailedDelivery
    ) {
      await this.initiateRefundForFailedSuborder(
        orderId,
        storeId,
        status,
        session,
      );
    }

    await orderDoc.save({ session });

    return order.toJSON();
  }

  /**
   * Reverse vendor funds and open a customer refund when a suborder transitions
   * to a terminal failure state (Canceled or FailedDelivery).
   *
   * The suborder's financial data lives on the TransactionRecord, not the Order.
   * We load it by orderId and locate this store's breakdown by vendorId, which
   * also yields the suborderId (the same one-suborder-per-store assumption the
   * domain's updateSubOrderStatus already relies on).
   *
   * Eligibility is gated on the breakdown's SuborderFinancialStatus:
   *   PENDING   → refund (funds still in VENDOR_PENDING, safe to reverse)
   *   SETTLED   → THROW: funds already released to the vendor. Refunding here
   *               would corrupt the ledger, so we fail loudly to surface the
   *               upstream bug rather than silently mishandle money.
   *   HELD /
   *   DISPUTED  → skip: the dispute flow owns this money and issues its own refund
   *   REFUNDED  → skip: already refunded (the partial unique index on RefundRecord
   *               is the hard guard against a second active refund)
   *
   * Also skipped when there is no successful captured payment for the order,
   * because there is nothing to refund.
   *
   * Delegates the actual money movement to the DB-only phase of RefundService
   * (initiate*Refund), which does all ledger/wallet/record writes on this
   * session and performs NO network I/O.
   */
  private async initiateRefundForFailedSuborder(
    orderId: string,
    storeId: string,
    status: DeliveryStatus,
    session: mongoose.ClientSession,
  ): Promise<void> {
    const TransactionRecord = await getTransactionRecordModel();

    const txn = await TransactionRecord.findOne({
      orderId: new mongoose.Types.ObjectId(orderId),
    }).session(session);

    // No captured payment → nothing to refund.
    if (!txn || txn.flutterwaveStatus !== FlutterwavePaymentStatus.SUCCESSFUL) {
      return;
    }

    // Locate this store's suborder breakdown. In a breakdown, vendorId IS the
    // storeId, and the breakdown carries the suborderId and the money figures.
    const breakdown = txn.suborderBreakdowns.find((b) =>
      b.vendorId.equals(storeId),
    );

    // Defensive: a successful transaction should always carry a breakdown for
    // every store on the order. Absence is a data gap, not a refundable event.
    if (!breakdown) {
      return;
    }

    // SETTLED funds have already left the pending bucket. Fail loudly.
    if (breakdown.status === SuborderFinancialStatus.SETTLED) {
      throw new AppError(
        "BAD_REQUEST",
        "Cannot refund a settled suborder via a delivery-status change: funds have already been released to the vendor.",
        {
          orderId,
          storeId,
          suborderId: breakdown.suborderId.toString(),
        },
      );
    }

    // Only PENDING funds are eligible for this refund path.
    if (breakdown.status !== SuborderFinancialStatus.PENDING) {
      return;
    }

    const refundInput = {
      suborderId: breakdown.suborderId.toString(),
      orderId,
      vendorId: storeId,
      customerId: txn.customerId.toString(),
      settleAmount: breakdown.settleAmount,
      commission: breakdown.commission,
      // TransactionRecord stores the numeric Flutterwave id; the refund layer
      // and RefundRecord type it as a string.
      flutterwaveTransactionId: txn.flutterwaveTransactionId.toString(),
      session,
    };

    if (status === DeliveryStatus.Canceled) {
      // Full refund: settle + commission reversed.
      await RefundService.initiateOrderCancellationRefund(refundInput);
    } else {
      // FailedDelivery: settleAmount refunded, commission kept by Soraxi.
      await RefundService.initiateFailedDeliveryRefund(refundInput);
    }
  }

  async confirmDelivery(
    orderId: string,
    storeId: string,
    session: mongoose.ClientSession,
  ) {
    const orderDoc = await OrderRepository.getOrderById(orderId);

    if (!orderDoc) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    const order = new Order(orderDoc);

    order.confirmDelivery(storeId);

    await orderDoc.save({ session });

    return order.toJSON();
  }
}
