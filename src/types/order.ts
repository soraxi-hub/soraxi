import {
  DeliveryStatus,
  DeliveryType,
  ProductTypeEnum,
  StatusHistory,
} from "@/enums";
import {
  DiscountSchemaOptional,
  DiscountType,
  IDiscount,
} from "@/validators/discount-validation";
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

/**
 * Represents the delivery address and location details
 * provided by the customer for an order.
 */
export interface ShippingAddress {
  /**
   * The full delivery address or street location.
   */
  address: string;

  /**
   * The city where the order should be delivered.
   */
  city: string;

  /**
   * The state where the delivery destination is located.
   */
  state: string;

  /**
   * The postal or ZIP code associated with the delivery location.
   */
  postalCode: string;

  /**
   * Specifies the delivery method selected by the customer
   */
  deliveryType: DeliveryType;

  /**
   * The name of the campus where the order should be delivered,
   * applicable only for campus deliveries.
   */
  campusName?: string;

  /**
   * The specific location or landmark within the campus where
   * the order should be delivered.
   */
  campusLocation?: string;
}

/**
 * Tracks whether a customer has confirmed that a sub-order
 * was successfully delivered.
 */
export interface CustomerConfirmedDelivery {
  /**
   * Indicates whether the customer manually confirmed receiving the order.
   */
  confirmed: boolean;

  /**
   * The date and time when the customer confirmed delivery.
   */
  confirmedAt?: Date;

  /**
   * Indicates whether the system automatically marked the order
   * as delivered after the confirmation period elapsed.
   */
  autoConfirmed: boolean;
}

/**
 * Represents an immutable financial snapshot of a sub-order
 * at the time of purchase. It records the amount paid by the
 * customer, discounts applied, platform earnings, and the
 * final amount owed to the vendor.
 *
 * All monetary values are stored in kobo to prevent
 * floating-point precision errors.
 */
export interface ISubOrderFinancials {
  /**
   * The total value of all products before any discounts
   * or platform deductions are applied.
   */
  subtotal: number;

  /**
   * Details of any discount or coupon applied to the sub-order.
   */
  discount?: DiscountType;

  /**
   * The final amount paid by the customer after discounts
   * have been applied.
   */
  amountPaid: number;

  /**
   * The commission retained by the platform from this sub-order.
   * Stores both the calculated amount and the percentage used
   * at the time the order was placed.
   */
  platformFee: {
    /**
     * The commission rate applied by the platform at the time
     * of the transaction.
     */
    percentage: number;

    /**
     * The monetary amount deducted by the platform as commission.
     */
    amount: number;
  };

  /**
   * The amount that is owed to the vendor after deducting
   * the platform commission.
   */
  vendorSettlementAmount: number;
}
export interface PopulatedProduct {
  _id: string;
  name: string;
  images: string[];
  price: number;
  productType: ProductTypeEnum;
  storeId: string;
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
  // Product: PopulatedProduct; // Commented out to reduce data exposure and a more reliable source of truth for display is the productSnapshot & storeSnapshot. I am still keeping this commented out for reference purposes only.
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
  originalAmount: number;
  totalAmount: number;
  deliveryStatus: DeliveryStatus;
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
  discount?: IDiscount;
  statusHistory: Array<{
    status: StatusHistory;
    timestamp: Date;
    notes?: string;
  }>;
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
    deliveryType: DeliveryType;
  };
  discount?: IDiscount;
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
    // name: string;
    // price: number;
    // quantity: number;
    // image?: string;
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
    deliveryType: DeliveryType;
  };
  discount?: IDiscount;
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
  userId: PopulatedUser | mongoose.Types.ObjectId;
  stores: mongoose.Types.ObjectId[] | PopulatedStore[];
  totalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string;
  shippingAddress?: {
    postalCode: string;
    address: string;
    deliveryType: DeliveryType;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  discount?: IDiscount;
  subOrders: Array<{
    _id: mongoose.Types.ObjectId;
    storeId: PopulatedStore | mongoose.Types.ObjectId;
    products: Array<{
      _id: mongoose.Types.ObjectId;
      productId: PopulatedProduct | mongoose.Types.ObjectId;
      storeId: mongoose.Types.ObjectId;
      productSnapshot: {
        _id: mongoose.Schema.Types.ObjectId;
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
        _id: mongoose.Schema.Types.ObjectId;
        name: string;
        logo?: string;
        email?: string;
      };
    }>;
    originalAmount: number;
    totalAmount: number;
    deliveryStatus: DeliveryStatus;
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
    discount?: IDiscount;
    statusHistory: Array<{
      status: StatusHistory;
      timestamp: Date;
      notes?: string;
    }>;
  }>;
}

// Zod schema for a product within a sub-order after population and formatting
export const FormattedOrderProductSchema = z.object({
  _id: z.string(),
  // Product: z.object({
  //   _id: z.string(),
  //   name: z.string(),
  //   images: z.array(z.string()),
  //   price: z.number(), // Assuming this is already converted to Naira (koboToNaira)
  //   productType: z.string(),
  //   category: z.array(z.string()),
  //   subCategory: z.array(z.string()),
  // }),
  // store: z.string(), // This is the store ObjectId as string, but it's populated in subOrder.store
  productSnapshot: z.object({
    _id: z.string(),
    name: z.string(),
    images: z.array(z.string()),
    quantity: z.number(),
    price: z.number(), // Already in Kobo
    category: z.string().optional(),
    subCategory: z.string().optional(),
    selectedSize: z
      .object({
        size: z.string(),
        price: z.number(),
      })
      .optional(),
  }),
  storeSnapshot: z.object({
    _id: z.string(),
    name: z.string(),
    logo: z.string().optional(),
    email: z.string().optional(),
  }),
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
  originalAmount: z.number(),
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
  deliveryStatus: z.nativeEnum(DeliveryStatus),
  customerConfirmedDelivery: z.object({
    confirmed: z.boolean(),
    confirmedAt: z.string().datetime().optional(),
    autoConfirmed: z.boolean(),
  }),
  discount: DiscountSchemaOptional,
  statusHistory: z.array(
    z.object({
      status: z.nativeEnum(StatusHistory),
      timestamp: z.string().datetime(),
      notes: z.string().optional(),
    }),
  ),
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
  discount: DiscountSchemaOptional,
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
