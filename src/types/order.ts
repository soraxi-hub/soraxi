import mongoose from "mongoose";

/**
 * Type definitions for populated order data structures
 *
 * These interfaces define the exact shape of data returned from MongoDB
 * after population, ensuring type safety throughout the application.
 */

/**
 * Populated Product Interface
 *
 * Represents a product document after population in order queries.
 * All ObjectIds are converted to strings for client-side compatibility.
 */
export interface PopulatedProduct {
  _id: string;
  name: string;
  images: string[];
  price: number;
  productType: "Product" | "digitalproducts";
  storeID: string;
}

/**
 * Populated Store Interface
 *
 * Represents a store document after population in order queries.
 * Contains essential store information needed for order display.
 */
export interface PopulatedStore {
  _id: string;
  name: string;
  storeEmail: string;
  logoUrl?: string;
}

/**
 * Order Product Interface
 *
 * Represents a product within an order, including quantity and pricing.
 * Used in sub-orders to track individual product purchases.
 */
export interface OrderProduct {
  _id: string;
  Product: PopulatedProduct;
  store: string;
  quantity: number;
  price: number;
  selectedSize?: {
    size: string;
    price: number;
  };
}

/**
 * Sub-Order Interface
 *
 * Represents a sub-order within a main order, grouped by store.
 * Contains all products from a single store and delivery information.
 */
export interface SubOrder {
  _id: string;
  store: PopulatedStore;
  products: OrderProduct[];
  totalAmount: number;
  deliveryStatus:
    | "Order Placed"
    | "Processing"
    | "Shipped"
    | "Out for Delivery"
    | "Delivered"
    | "Canceled"
    | "Returned"
    | "Failed Delivery"
    | "Refunded";
  shippingMethod?: {
    name: string;
    price: number;
    estimatedDeliveryDays?: string;
    description?: string;
  };
  deliveryDate?: Date;
  customerConfirmedDelivery: {
    confirmed: boolean;
    confirmedAt: Date;
    autoConfirmed: boolean;
  };
  escrow: {
    held: boolean;
    released: boolean;
    releasedAt?: Date;
    refunded: boolean;
    refundReason?: string;
  };
  returnWindow?: Date;
}

export interface PopulatedUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

/**
 * Formatted Order Interface
 *
 * Represents the final order structure returned to clients.
 * All ObjectIds are converted to strings and data is properly formatted.
 */
export interface FormattedOrder {
  _id: string;
  user: PopulatedUser | string;
  stores: string[];
  totalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string;
  shippingAddress?: {
    postalCode: string;
    address: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  subOrders: SubOrder[];
}

/**
 * Formatted Order Interface
 *
 * Represents the final order structure returned to clients.
 * All ObjectIds are converted to strings and data is properly formatted.
 */
export interface FormattedOrderForAdmin {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  // status:
  //   | "Order Placed"
  //   | "Processing"
  //   | "Shipped"
  //   | "Out for Delivery"
  //   | "Delivered"
  //   | "Canceled"
  //   | "Returned"
  //   | "Failed Delivery"
  //   | "Refunded";
  // status: string;
  paymentStatus: string;
  totalAmount: number;
  shippingAddress?: {
    postalCode: string;
    address: string;
  };
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

/**
 * Raw MongoDB Order Document Interface
 *
 * Represents the order document as it exists in MongoDB before population.
 * Used for type safety during database operations.
 */
export interface RawOrderDocument {
  _id: mongoose.Types.ObjectId;
  user: PopulatedUser | mongoose.Types.ObjectId;
  stores: mongoose.Types.ObjectId[] | PopulatedStore[];
  totalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string;
  shippingAddress?: {
    postalCode: string;
    address: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  subOrders: Array<{
    _id: mongoose.Types.ObjectId;
    store: PopulatedStore | mongoose.Types.ObjectId;
    products: Array<{
      _id: mongoose.Types.ObjectId;
      Product: PopulatedProduct | mongoose.Types.ObjectId;
      store: mongoose.Types.ObjectId;
      quantity: number;
      price: number;
      selectedSize?: {
        size: string;
        price: number;
      };
    }>;
    totalAmount: number;
    deliveryStatus: string;
    shippingMethod?: {
      name: string;
      price: number;
      estimatedDeliveryDays?: string;
      description?: string;
    };
    deliveryDate?: Date;
    customerConfirmedDelivery: {
      confirmed: boolean;
      confirmedAt: Date;
      autoConfirmed: boolean;
    };
    escrow: {
      held: boolean;
      released: boolean;
      releasedAt?: Date;
      refunded: boolean;
      refundReason?: string;
    };
    returnWindow?: Date;
  }>;
}
