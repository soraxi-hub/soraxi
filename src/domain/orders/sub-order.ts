import { DeliveryStatus, StatusHistory as StatusHistoryEnums } from "@/enums";

interface OrderProduct {
  productId: string;
  storeId: string;
  productSnapshot: {
    _id: string;
    name: string;
    images: string[];
    quantity: number;
    price: number;
    category?: string;
    subCategory?: string;
    selectedSize?: {
      size: string;
      price: number;
    };
  };
  storeSnapshot: {
    _id: string;
    name: string;
    logo?: string;
    email?: string;
  };
}

interface ShippingMethod {
  name: string | undefined;
  price: number;
  estimatedDeliveryDays: string;
  description: string | undefined;
}

interface Escrow {
  held: boolean;
  released: boolean;
  refunded: boolean;
}

interface StatusHistory {
  status: StatusHistoryEnums;
  notes: string;
}

export class SubOrder {
  protected id?: string;
  protected storeId: string;
  protected products: OrderProduct[];
  protected totalAmount: number;
  protected deliveryStatus: string;
  protected shippingMethod: ShippingMethod;
  protected escrow: Escrow;
  protected statusHistory: StatusHistory[];
  protected customerConfirmedDelivery?: {
    confirmed: boolean;
    confirmedAt?: Date;
    autoConfirmed?: boolean;
  };

  constructor(params: {
    id?: string;
    storeId: string;
    products: OrderProduct[];
    totalAmount: number;
    deliveryStatus: DeliveryStatus;
    shippingMethod: ShippingMethod;
    escrow: Escrow;
    statusHistory: StatusHistory[];
    customerConfirmedDelivery?: {
      confirmed: boolean;
      confirmedAt?: Date;
      autoConfirmed?: boolean;
    };
  }) {
    this.id = params.id;
    this.storeId = params.storeId;
    this.products = params.products;
    this.totalAmount = params.totalAmount;
    this.deliveryStatus = params.deliveryStatus;
    this.shippingMethod = params.shippingMethod;
    this.escrow = params.escrow;
    this.statusHistory = params.statusHistory;
    this.customerConfirmedDelivery = params.customerConfirmedDelivery;
  }

  // ------------------
  // Getters
  // ------------------

  getId() {
    return this.id;
  }

  getStore() {
    return this.storeId;
  }

  getProducts() {
    return this.products;
  }

  getTotalAmount() {
    return this.totalAmount;
  }

  getDeliveryStatus() {
    return this.deliveryStatus;
  }

  isDeliveryConfirmed() {
    return this.customerConfirmedDelivery?.confirmed ?? false;
  }

  // ------------------
  // Business Methods
  // ------------------

  confirmDelivery(autoConfirmed = false) {
    this.customerConfirmedDelivery = {
      confirmed: true,
      confirmedAt: new Date(),
      autoConfirmed,
    };
  }
}
