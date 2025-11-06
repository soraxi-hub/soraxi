import { DeliveryType, PaymentStatus } from "@/enums";
import { Order } from "./order";
import { SubOrder } from "./sub-order";
import { ProcessOrder } from "./process-order";

export class OrderFactory {
  private static processOrderInstance: ProcessOrder | null = null;

  static createOrder(params: {
    userId: string;
    subOrders: SubOrder[];
    totalAmount: number;
    shippingAddress: {
      postalCode: string;
      address: string;
      deliveryType: DeliveryType;
      campusName?: string;
      campusLocation?: string;
    };
    paymentStatus: PaymentStatus;
    idempotencyKey: string;
    id?: string;
  }): Order {
    return new Order({
      userId: params.userId,
      subOrders: params.subOrders,
      totalAmount: params.totalAmount,
      shippingAddress: params.shippingAddress,
      paymentStatus: params.paymentStatus,
      idempotencyKey: params.idempotencyKey,
    });
  }

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
