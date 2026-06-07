import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { ProductTypeEnum } from "@/enums";
import { Size } from "./product.model";

/**
 * Interface for a single item in the cart
 * Each item holds a product reference, quantity, and optional size details.
 */
export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  quantity: number;
  productType: ProductTypeEnum;
  selectedSize?: Size;
}

/**
 * Interface for the Cart document
 * Represents a user's shopping cart with polymorphic product support.
 */
export interface ICart {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey?: string;
}

export type ICartDocument = ICart & Document;

/**
 * Schema for a single cart item
 * Supports products from different stores and types, with optional sizing.
 */
const CartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      refPath: "items.productType", // Dynamic reference based on productType
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    productType: {
      type: String,
      required: true,
      enum: Object.values(ProductTypeEnum),
    },
    selectedSize: {
      size: { type: String },
      price: { type: Number },
      quantity: { type: Number },
    },
  },
  { _id: false }, // Prevents Mongoose from auto-creating an _id for subdocuments
);

/**
 * Mongoose schema for the Cart
 * Associates a single cart with a user and their product selections.
 */
const CartSchema = new Schema<ICartDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true,
    },
    items: [CartItemSchema],
    idempotencyKey: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Get the Cart model
 * Uses a cached model if available to avoid re-compilation in development
 *
 * @returns Mongoose Cart model
 */
export async function getCartModel(): Promise<Model<ICartDocument>> {
  await connectToDatabase();

  return (
    (mongoose.models.Cart as Model<ICartDocument>) ||
    mongoose.model<ICartDocument>("Cart", CartSchema)
  );
}
