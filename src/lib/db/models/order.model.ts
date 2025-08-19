import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * Interface representing a product in an order.
 * All monetary values are stored in kobo to avoid floating-point errors.
 */
export interface IOrderProduct {
  Product: mongoose.Schema.Types.ObjectId;
  store: mongoose.Schema.Types.ObjectId;
  quantity: number;
  price: number;
  selectedSize?: {
    size: string;
    price: number;
  };
}

/**
 * Interface representing a sub-order within an order.
 */
export interface ISubOrder {
  _id: mongoose.Schema.Types.ObjectId;
  store: mongoose.Schema.Types.ObjectId;
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
  customerConfirmedDelivery: {
    confirmed: boolean; // true if customer manually confirmed delivery
    confirmedAt?: Date; // when the customer confirmed
    autoConfirmed: boolean; // true if system auto-confirmed
  };
  settlement?: {
    amount: number; // Amount after commission has been deducted
    shippingPrice: number; // Gotten from the selected Shipping method and added to the amount to reflect the total settlement for the store.
  };
  escrow: {
    held: boolean; // money is currently in escrow
    released: boolean; // money has been paid to seller
    releasedAt: Date; // when escrow was released
    refunded: boolean; // for returned or refunded orders
    refundReason: string; // optional reason
  };
  returnWindow: Date; // to track deadline for returns before releasing escrow

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
    status:
      | "Order Placed"
      | "Processing"
      | "Shipped"
      | "Out for Delivery"
      | "Delivered"
      | "Canceled"
      | "Return Requested"
      | "Returned"
      | "Failed Delivery"
      | "Approved" // For when the return is approved
      | "Rejected" // For when the return is rejected
      | "In-Transit" // For when the return is in transit
      | "Received" // For when the return is received
      | "Refunded"; // For when the return is refunded
    timestamp: Date;
    notes?: string;
  }>;
}

/**
 * Interface representing the main Order document.
 */
export interface IOrder extends Document {
  user: mongoose.Schema.Types.ObjectId;
  stores: mongoose.Schema.Types.ObjectId[];
  subOrders: ISubOrder[];
  totalAmount: number;
  shippingAddress?: {
    postalCode: string;
    address: string;
  };
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  discount?: number;
  taxAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for individual products inside a sub-order.
 */
const OrderProductSchema = new Schema<IOrderProduct>({
  Product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  selectedSize: {
    size: { type: String },
    price: { type: Number },
  },
});

/**
 * Schema for sub-orders linked to stores.
 */
const SubOrderSchema = new Schema<ISubOrder>({
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  products: [OrderProductSchema],
  totalAmount: { type: Number, required: true },
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
    enum: [
      "Order Placed",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Canceled",
      "Returned",
      "Failed Delivery",
      "Refunded",
    ],
    default: "Order Placed",
  },
  customerConfirmedDelivery: {
    confirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date },
    autoConfirmed: { type: Boolean, default: false },
  },
  settlement: {
    amount: { type: Number },
    shippingPrice: { type: Number },
  },
  escrow: {
    held: { type: Boolean, default: true }, // money is currently in escrow
    released: { type: Boolean, default: false }, // money has been paid to seller
    releasedAt: { type: Date }, // when escrow was released
    refunded: { type: Boolean, default: false }, // for returned or refunded orders
    refundReason: { type: String }, // optional reason
  },
  returnWindow: { type: Date }, // set at delivery, e.g., +7 days
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
        required: true,
      },
      quantity: { type: Number, required: true },
      reason: { type: String, required: true },
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
        enum: [
          "Order Placed",
          "Processing",
          "Shipped",
          "Out for Delivery",
          "Delivered",
          "Canceled",
          "Return Requested",
          "Returned",
          "Failed Delivery",
          "Approved", // For when the return is approved
          "Rejected", // For when the return is rejected
          "In-Transit", // For when the return is in transit
          "Received", // For when the return is received
          "Refunded", // For when the return is refunded
        ],
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Store",
        required: true,
      },
    ],
    subOrders: [SubOrderSchema],
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      postalCode: { type: String, required: true },
      address: { type: String, required: true },
    },
    paymentMethod: { type: String },
    paymentStatus: { type: String },
    notes: { type: String },
    discount: { type: Number },
    taxAmount: { type: Number },
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
  const Order = await getOrderModel();

  const query = Order.findById(id)
    .populate({
      path: "user",
      model: "User",
      select: "_id firstName lastName email phoneNumber",
    })
    .populate({
      path: "subOrders.products.Product",
      model: "Product",
      select: "_id name images price productType storeID",
    })
    .populate({
      path: "subOrders.store",
      model: "Store",
      select: "name storeEmail logo",
    });

  return lean ? query.lean().exec() : query.exec();
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
    ? Order.find({ user: userId }).lean()
    : Order.find({ user: userId });
}
