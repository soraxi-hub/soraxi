import { ProcessOrder } from "@/services/orders/process-order.service";

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
}
