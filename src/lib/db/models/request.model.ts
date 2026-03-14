import mongoose, { Schema, Document, Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { koboToNaira, nairaToKobo } from "@/lib/utils/naira";

/**
 * Status of a request post.
 * - Open: Request is active and still looking for responses
 * - Fulfilled: User has found what they were looking for
 * - Expired: Request is no longer valid (auto or manual expiry)
 */
export enum RequestStatus {
  Open = "open",
  Fulfilled = "fulfilled",
  Expired = "expired",
}

/**
 * IRequest Interface
 *
 * Represents a "Looking For" post created by a user.
 * This allows buyers to publicly request items they want,
 * creating a two-way marketplace system in SORAXI.
 */
export interface IRequest {
  _id: mongoose.Types.ObjectId;

  /** User who created the request */
  userId: mongoose.Types.ObjectId;

  /** Short title describing what the user is looking for */
  title: string;

  /** Detailed explanation of the request */
  description?: string;

  /** Categories to help with filtering/search */
  category?: string[];

  /** Minimum expected price (in kobo) */
  budgetMin: number;

  /** Maximum expected price (in kobo) */
  budgetMax: number;

  /** Optional images for reference */
  images?: string[];

  /** Current lifecycle status of the request */
  status: RequestStatus;

  createdAt: Date;
  updatedAt: Date;
}

export type IRequestDocument = IRequest & Document;

/**
 * Request Schema
 *
 * Stores "Looking For" posts created by users.
 * These posts allow sellers to discover demand in the marketplace.
 */
const RequestSchema = new Schema<IRequestDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Request title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },

    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    /**
     * Categories help organize requests
     * and allow filtering in the marketplace.
     */
    category: [
      {
        type: String,
      },
    ],

    /**
     * Price expectation range.
     * Helps sellers determine whether they can satisfy the request.
     */
    budgetMin: {
      set: (price: number) => nairaToKobo(price),
      get: (price: number) => koboToNaira(price),
      type: Number,
      required: [true, "At least a minimum budget is required"],
    },

    budgetMax: {
      type: Number,
      validate: {
        validator: function (value: number) {
          return !this.budgetMin || value >= this.budgetMin;
        },
        message: "budgetMax must be greater than budgetMin",
      },
      set: (price: number) => nairaToKobo(price),
      get: (price: number) => koboToNaira(price),
      required: [true, "At least a maximum budget is required"],
    },

    /**
     * Images are optional and may include
     * reference photos or screenshots.
     */
    images: [
      {
        type: String,
      },
    ],

    /**
     * Tracks the lifecycle of the request.
     */
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.Open,
      index: true,
    },
  },
  { timestamps: true },
);

RequestSchema.index({ status: 1, createdAt: -1 });

/**
 * Model Getter
 *
 * Ensures the database connection exists before accessing the model.
 * Prevents model recompilation errors during hot reload in Next.js.
 */
export async function getRequestModel(): Promise<Model<IRequestDocument>> {
  await connectToDatabase();

  return (
    (mongoose.models.Request as Model<IRequestDocument>) ||
    mongoose.model<IRequestDocument>("Request", RequestSchema)
  );
}
