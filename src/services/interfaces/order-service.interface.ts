import { Order } from "@/domain/orders/order";
import mongoose from "mongoose";

export interface IOrderService {
  getOrderUserView(
    orderId: string,
    lean: boolean,
  ): Promise<ReturnType<Order["toJSON"]>>;

  getOrderStoreView(
    orderId: string,
    storeId: string,
    lean: boolean,
  ): Promise<ReturnType<Order["toStoreJSON"]>>;

  getOrdersByUser(userId: string): Promise<ReturnType<Order["toJSON"]>[]>;

  getOrderForStore(
    orderId: string,
    storeId: string,
    lean: boolean,
  ): Promise<ReturnType<Order["toStoreJSON"]>>;

  getStoreOrders(
    storeId: string,
    options: {
      startDate?: string;
      endDate?: string;
      deliveryStatus?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    orders: ReturnType<Order["toStoreJSON"]>[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      limit: number;
    };
    filters: {
      dateRange: { startDate: string; endDate: string } | null;
      deliveryStatus: string;
    };
  }>;

  markOrderPaid(
    orderId: string,
    session: mongoose.ClientSession,
  ): Promise<ReturnType<Order["toJSON"]>>;

  markOrderPaymentFailed(
    orderId: string,
    session: mongoose.ClientSession,
  ): Promise<ReturnType<Order["toJSON"]>>;

  updateDeliveryStatus(
    orderId: string,
    storeId: string,
    status: any,
    notes: string | undefined,
    session: mongoose.ClientSession,
  ): Promise<ReturnType<Order["toJSON"]>>;

  confirmDelivery(
    orderId: string,
    storeId: string,
    session: mongoose.ClientSession,
  ): Promise<ReturnType<Order["toJSON"]>>;
}
