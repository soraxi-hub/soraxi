import mongoose, { Schema, Document, Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * Product Review Interface - represents a single review of a product by a buyer
 */
export interface IProductReview extends Document {
  productId: mongoose.Schema.Types.ObjectId;
  productType: "Product" | "digitalproducts";
  customerId: mongoose.Schema.Types.ObjectId;
  rating: number;
  reviewText: string;
  orderId: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Product Review Schema
const ProductReviewSchema = new Schema<IProductReview>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "productType", // Dynamic reference
    },
    productType: {
      type: String,
      required: true,
      enum: ["Product", "digitalproducts"],
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    reviewText: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure unique review per product per buyer
ProductReviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });

/**
 * Model getter for ProductReview
 */
export async function getProductReviewModel(): Promise<Model<IProductReview>> {
  await connectToDatabase();
  return (
    (mongoose.models.ProductReview as Model<IProductReview>) ||
    mongoose.model<IProductReview>("ProductReview", ProductReviewSchema)
  );
}
