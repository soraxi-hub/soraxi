import mongoose from "mongoose";
import { z } from "zod";

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

// Zod schema for a product within a sub-order after population and formatting
export const FormattedOrderProductSchema = z.object({
  _id: z.string(),
  Product: z.object({
    _id: z.string(),
    name: z.string(),
    images: z.array(z.string()),
    price: z.number(), // Assuming this is already converted to Naira (koboToNaira)
    productType: z.string(),
    category: z.array(z.string()),
    subCategory: z.array(z.string()),
  }),
  store: z.string(), // This is the store ObjectId as string, but it's populated in subOrder.store
  quantity: z.number(),
  price: z.number(), // Price per item, assuming converted to Naira
  selectedSize: z
    .object({
      size: z.string(),
      price: z.number(),
    })
    .optional(),
});

// Zod schema for a populated store within a sub-order
export const PopulatedStoreSchema = z.object({
  _id: z.string(),
  name: z.string(),
  storeEmail: z.string(),
  logoUrl: z.string().optional(),
});

// Zod schema for a sub-order after population and formatting
export const FormattedSubOrderSchema = z.object({
  _id: z.string(),
  store: PopulatedStoreSchema, // Populated store details
  products: z.array(FormattedOrderProductSchema),
  totalAmount: z.number(), // Assuming converted to Naira
  shippingMethod: z
    .object({
      name: z.string(),
      price: z.number(),
      estimatedDeliveryDays: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  deliveryDate: z.string().datetime().optional(), // ISO string
  deliveryStatus: z.enum([
    "Order Placed",
    "Processing",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Canceled",
    "Returned",
    "Failed Delivery",
    "Refunded",
  ]),
  customerConfirmedDelivery: z.object({
    confirmed: z.boolean(),
    confirmedAt: z.string().datetime().optional(),
    autoConfirmed: z.boolean(),
  }),
  settlement: z
    .object({
      amount: z.number(),
      shippingPrice: z.number(),
    })
    .optional(),
  escrow: z.object({
    held: z.boolean(),
    released: z.boolean(),
    releasedAt: z.string().datetime().optional(),
    refunded: z.boolean(),
    refundReason: z.string().optional(),
  }),
  returnWindow: z.string().datetime().optional(),
});

// Zod schema for a populated user
export const PopulatedUserSchema = z.object({
  _id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phoneNumber: z.string().optional(),
});

// Zod schema for the main order document after population and formatting
export const FormattedStoreOrderDocumentSchema = z.object({
  _id: z.string(),
  user: PopulatedUserSchema, // Populated user details
  stores: z.array(z.string()), // Array of store ObjectIds as strings
  subOrders: z.array(FormattedSubOrderSchema),
  totalAmount: z.number(), // Assuming converted to Naira
  shippingAddress: z
    .object({
      postalCode: z.string(),
      address: z.string(),
    })
    .optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  notes: z.string().optional(),
  discount: z.number().optional(),
  taxAmount: z.number().optional(),
  createdAt: z.string().datetime(), // ISO string
  updatedAt: z.string().datetime(), // ISO string
});

// Zod schema for the output of getStoreOrders procedure
export const GetStoreOrdersOutputSchema = z.object({
  success: z.boolean(),
  orders: z.array(FormattedStoreOrderDocumentSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalCount: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
    limit: z.number(),
  }),
  filters: z.object({
    dateRange: z
      .object({
        startDate: z.string(),
        endDate: z.string(),
      })
      .nullable(),
    deliveryStatus: z.string(),
    searchQuery: z.string(),
  }),
});

// Zod schema for the output of getStoreOrderById procedure
export const GetStoreOrderByIdOutputSchema = z.object({
  success: z.boolean(),
  order: FormattedStoreOrderDocumentSchema,
});
