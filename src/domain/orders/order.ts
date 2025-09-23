import { DeliveryType, PaymentStatus } from "@/enums";
import { Cart } from "../cart/cart";
import { SubOrder } from "./sub-order";

export class Order {
  protected userId: string;
  protected subOrders: SubOrder[];
  protected totalAmount: number;
  protected shippingAddress: {
    postalCode: string;
    address: string;
    deliveryType: DeliveryType;
    campusName?: string;
    campusLocation?: string;
  };
  protected paymentStatus: PaymentStatus;
  protected idempotencyKey: string;
  constructor(params: {
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
  }) {
    this.userId = params.userId;
    this.subOrders = params.subOrders;
    this.totalAmount = params.totalAmount;
    this.shippingAddress = params.shippingAddress;
    this.paymentStatus = params.paymentStatus;
    this.idempotencyKey = params.idempotencyKey;
  }

  placeOrder() {}

  existingOrder(cart: Cart) {
    return cart.getIdempotencyKey() === this.idempotencyKey;
  }
}
