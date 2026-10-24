import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { ICartItem } from "./cart.model";
import { ProductTypeEnum } from "@/enums";

/**
 * Cart for a logged-out visitor, keyed by the anonymous guest-id cookie
 * instead of a userId. Deliberately a separate model from `Cart` (per
 * guest-cart Option C) so checkout and order creation — which sit directly
 * on top of `Cart` — never have to account for a cart that might not have a
 * real user behind it. Merged into the real `Cart` via `CartService.addToCart`
 * on login/signup, then deleted.
 */
export interface IGuestCart {
  _id?: mongoose.Types.ObjectId;
  guestId: string;
  items: ICartItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IGuestCartDocument = IGuestCart & Document;

const GuestCartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      refPath: "items.productType",
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
  { _id: false },
);

const GuestCartSchema = new Schema<IGuestCartDocument>(
  {
    guestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: [GuestCartItemSchema],
    // Abandoned guest carts should not live forever — 30 days from creation.
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  },
);

GuestCartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export async function getGuestCartModel(): Promise<Model<IGuestCartDocument>> {
  await connectToDatabase();

  return (
    (mongoose.models.GuestCart as Model<IGuestCartDocument>) ||
    mongoose.model<IGuestCartDocument>("GuestCart", GuestCartSchema)
  );
}
