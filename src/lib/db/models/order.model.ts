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
  store: mongoose.Schema.Types.ObjectId;
  products: IOrderProduct[];
  totalAmount: number;
  shippingMethod?: {
    name: string;
    price: number;
    estimatedDeliveryDays?: string;
    description?: string;
  };
  trackingNumber?: string;
  deliveryDate?: Date;
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
  escrow: {
    held: { type: Boolean; default: true }; // money is currently in escrow
    released: { type: Boolean; default: false }; // money has been paid to seller
    releasedAt: { type: Date }; // when escrow was released
    refunded: { type: Boolean; default: false }; // for returned or refunded orders
    refundReason: { type: String }; // optional reason
  };
  returnWindow: { type: Date }; // to track deadline for returns before releasing escrow
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
  trackingNumber: { type: String },
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
  escrow: {
    held: { type: Boolean, default: true },
    released: { type: Boolean, default: false },
    releasedAt: { type: Date },
    refunded: { type: Boolean, default: false },
    refundReason: { type: String },
  },
  returnWindow: { type: Date }, // set at delivery, e.g., +7 days
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

  let query = Order.findById(id)
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
