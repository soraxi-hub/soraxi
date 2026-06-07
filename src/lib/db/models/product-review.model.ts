import mongoose, { Schema, Document, Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { ProductTypeEnum } from "@/enums";

/**
 * Product Review Interface - represents a single review of a product by a buyer
 */
export interface IProductReview {
  productId: mongoose.Schema.Types.ObjectId;
  productType: ProductTypeEnum;
  customerId: mongoose.Schema.Types.ObjectId;
  rating: number;
  reviewText: string;
  orderId: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IProductReviewDocument = IProductReview & Document;

// Product Review Schema
const ProductReviewSchema = new Schema<IProductReviewDocument>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "productType", // Dynamic reference
    },
    productType: {
      type: String,
      required: true,
      enum: Object.values(ProductTypeEnum),
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
  { timestamps: true },
);

// Ensure unique review per product per buyer
ProductReviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });

/**
 * Model getter for ProductReview
 */
export async function getProductReviewModel(): Promise<
  Model<IProductReviewDocument>
> {
  await connectToDatabase();
  return (
    (mongoose.models.ProductReview as Model<IProductReviewDocument>) ||
    mongoose.model<IProductReviewDocument>("ProductReview", ProductReviewSchema)
  );
}
