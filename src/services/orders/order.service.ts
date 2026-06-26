import { IOrderService } from "../interfaces/order-service.interface";
import { OrderRepository } from "@/repositories/order.repository";
import { AppError } from "@/lib/errors/app-error";
import { Order } from "@/domain/orders/order";
import mongoose from "mongoose";
import { IOrder, IOrderDocument } from "@/lib/db/models/order.model";
import { FilterQuery } from "mongoose";
import { DeliveryStatus, PaymentStatus } from "@/enums";
import { OrderFactory } from "@/domain/orders/order-factory";

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
      true,
    )) as IOrderDocument | null;

    if (!orderDoc) {
      throw new AppError("NOT_FOUND", "Order not found");
    }

    const order = OrderFactory.createOrder(orderDoc);

    order.updateSubOrderStatus(storeId, status, notes);

    await orderDoc.save({ session });

    return order.toJSON();
  }

  async confirmDelivery(
    orderId: string,
    storeId: string,
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

    order.confirmDelivery(storeId);

    await orderDoc.save({ session });

    return order.toJSON();
  }
}
