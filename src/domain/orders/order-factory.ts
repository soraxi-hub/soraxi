import { OrderService } from "@/services/orders/order.service";
import { ProcessOrder } from "@/services/orders/process-order.service";
import { Order } from "./order";
import { IOrder, IOrderDocument } from "@/lib/db/models/order.model";

export class OrderFactory {
  private static processOrderInstance: ProcessOrder | null = null;

  /**
   * Initialize the ProcessOrders instance (lazy-loaded singleton)
   */
  static async getProcessOrderInstance(): Promise<ProcessOrder> {
    if (!OrderFactory.processOrderInstance) {
      OrderFactory.processOrderInstance = await ProcessOrder.init();
    }

    return OrderFactory.processOrderInstance;
  }

  static getOrderServiceInstance(): OrderService {
    return new OrderService();
  }

  static createOrder(order: IOrderDocument | IOrder): Order {
    return new Order(order);
  }
}
