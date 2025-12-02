import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  DeliveryStatus,
  DeliveryType,
  PaymentGateway,
  PaymentStatus,
  StatusHistory,
} from "@/enums";
import { getUserModel } from "./user.model";
import { getStoreModel } from "./store.model";
import { getProductModel } from "./product.model";

/**
 * Interface representing a product snapshot in an order.
 * All monetary values are stored in kobo to avoid floating-point errors.
 */
export interface IOrderProduct {
  productId: mongoose.Schema.Types.ObjectId;
  storeId: mongoose.Schema.Types.ObjectId;
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
}

/**
 * Interface representing a sub-order within an order.
 */
export interface ISubOrder {
  _id: mongoose.Schema.Types.ObjectId;
  storeId: mongoose.Schema.Types.ObjectId;
  products: IOrderProduct[];
  totalAmount: number;
  shippingMethod?: {
    name: string;
    price: number;
    estimatedDeliveryDays?: string; // Estimated number of days for delivery after order placement (e.g., "3-5 days")
    description?: string;
  };
  // trackingNumber?: string; // For the start and our MVP, we don't need it
  deliveryDate?: Date; // The date the product was delivered
  deliveryStatus: DeliveryStatus;
  customerConfirmedDelivery: {
    confirmed: boolean; // true if customer manually confirmed delivery
    confirmedAt?: Date; // when the customer confirmed
    autoConfirmed: boolean; // true if system auto-confirmed
  };

  // <CHANGE> Add returns tracking for individual product returns
  returns?: {
    _id: mongoose.Schema.Types.ObjectId; // Optional ID for the return request
    userId: mongoose.Schema.Types.ObjectId;
    productId: mongoose.Schema.Types.ObjectId;
    quantity: number; // How many units being returned
    reason: string;
    status:
      | "Requested"
      | "Approved"
      | "Rejected"
      | "In-Transit"
      | "Received"
      | "Refunded";
    requestedAt: Date;
    approvedAt?: Date;
    refundAmount: number;
    returnShippingCost?: number;
  }[];

  statusHistory: Array<{
    status: StatusHistory;
    timestamp: Date;
    notes?: string;
  }>;
}

/**
 * Interface representing the main Order document.
 */
export interface IOrder extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  stores: mongoose.Schema.Types.ObjectId[];
  subOrders: ISubOrder[];
  totalAmount: number;
  shippingAddress: {
    postalCode: string;
    address: string;
    // New fields for delivery type
    deliveryType: DeliveryType;
    campusName?: string;
    campusLocation?: string;
  };
  paymentStatus: PaymentStatus;
  idempotencyKey: string;
  paymentMethod?: string;
  paymentGateway?: PaymentGateway;
  notes?: string;
  discount?: number;
  taxAmount?: number;
  // expireAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for individual products inside a sub-order.
 */
const OrderProductSchema = new Schema<IOrderProduct>({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "ProductId is required for reference"],
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: [true, "StoreId is required for reference"],
  },
  productSnapshot: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Product snapshot ID is required"],
    },
    name: {
      type: String,
      required: [true, "Product name is required for product snapshot"],
    },
    images: [
      {
        type: String,
        required: [true, "Product images are required for product snapshot"],
      },
    ],
    quantity: {
      type: Number,
      required: [true, "Quantity is required for product snapshot"],
    },
    price: {
      type: Number,
      required: [true, "Price is required for product snapshot"],
    },
    category: { type: String },
    subCategory: { type: String },
    selectedSize: {
      size: { type: String },
      price: { type: Number },
    },
  },
  storeSnapshot: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Store snapshot ID is required"],
    },
    name: {
      type: String,
      required: [true, "Store name is required for store snapshot"],
    },
    logo: { type: String },
    email: { type: String },
  },
});

/**
 * Schema for sub-orders linked to stores.
 */
const SubOrderSchema = new Schema<ISubOrder>({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: [true, "StoreId is required for reference"],
  },
  products: [OrderProductSchema],
  totalAmount: { type: Number, required: [true, "Total amount is required"] },
  shippingMethod: {
    name: { type: String },
    price: { type: Number },
    estimatedDeliveryDays: { type: String },
    description: { type: String },
  },
  // trackingNumber: { type: String }, // For the start and our MVP, we don't need it
  deliveryDate: { type: Date },
  deliveryStatus: {
    type: String,
    enum: Object.values(DeliveryStatus),
    default: DeliveryStatus.OrderPlaced,
  },
  customerConfirmedDelivery: {
    confirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date },
    autoConfirmed: { type: Boolean, default: false },
  },
  // <CHANGE> Add returns schema for tracking individual product returns
  returns: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "ProductId is required for return"],
      },
      quantity: {
        type: Number,
        required: [true, "Quantity is required for return"],
      },
      reason: {
        type: String,
        required: [true, "Reason is required for return"],
      },
      status: {
        type: String,
        enum: [
          "Requested",
          "Approved",
          "Rejected",
          "In-Transit",
          "Received",
          "Refunded",
        ],
        default: "Requested",
      },
      requestedAt: { type: Date, default: Date.now },
      approvedAt: { type: Date },
      refundAmount: { type: Number, required: true },
      returnShippingCost: { type: Number },
    },
  ],
  statusHistory: [
    {
      status: {
        type: String,
        enum: Object.values(StatusHistory),
        required: true,
      },
      timestamp: { type: Date, default: Date.now },
      notes: String,
    },
  ],
});

/**
 * Main Order schema
 */
const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "UserId is required for reference"],
    },
    stores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
        required: [true, "StoreId is required for reference"],
      },
    ],
    subOrders: [SubOrderSchema],
    totalAmount: { type: Number, required: [true, "Total amount is required"] },
    shippingAddress: {
      postalCode: { type: String, required: [true, "Postal code is required"] },
      address: { type: String, required: [true, "Address is required"] },
      // New fields for delivery type
      deliveryType: {
        type: String,
        enum: Object.values(DeliveryType),
        required: [true, "Delivery type is required"],
      },
      campusName: { type: String },
      campusLocation: { type: String },
    },
    paymentMethod: { type: String },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.Pending,
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: Object.values(PaymentGateway),
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      sparse: true,
    }, // Only set at creation, cannot be changed even if the order is updated. Sparse to allow multiple nulls for old orders without the field
    notes: { type: String },
    discount: { type: Number },
    taxAmount: { type: Number },
    // expireAt: {
    //   type: Date,
    //   default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    //   index: { expires: 0 },
    // }, // TTL of 180 days, i.e., 6 months
  },
  {
    timestamps: true,
  }
);

/**
 * Get the Order model
 */
export async function getOrderModel(): Promise<Model<IOrder>> {
  await connectToDatabase();
  return (
    (mongoose.models.Order as Model<IOrder>) ||
    mongoose.model<IOrder>("Order", OrderSchema)
  );
}

/**
 * Get an order by ID
 * @param id - Order ID
 * @param lean - Whether to return a plain object or Mongoose document
 */
export async function getOrderById(
  id: string,
  lean = false
): Promise<IOrder | null> {
  await connectToDatabase();
  await getUserModel();
  await getStoreModel();
  await getProductModel();
  const Order = await getOrderModel();

  const query = Order.findById(id)
    .populate({
      path: "userId",
      model: "User",
      select: "_id firstName lastName email phoneNumber",
    })
    .populate({
      path: "subOrders.products.productId",
      model: "Product",
      select: "_id name images price productType storeId",
    })
    .populate({
      path: "subOrders.storeId",
      model: "Store",
      select: "name storeEmail logo",
    });

  return lean ? query.lean<IOrder>().exec() : query.exec();
}

/**
 * Get all orders by a user ID
 * @param userId - The user placing the orders
 * @param lean - Whether to return plain objects or Mongoose documents
 */
export async function getOrdersByUserId(
  userId: string,
  lean = false
): Promise<IOrder[] | null> {
  await connectToDatabase();
  const Order = await getOrderModel();

  return lean
    ? Order.find({ userId: userId }).lean<IOrder[]>()
    : Order.find({ userId: userId });
}
