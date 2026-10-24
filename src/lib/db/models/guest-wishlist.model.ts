import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { IWishlistItem } from "./wishlist.model";
import { ProductTypeEnum } from "@/enums";

/**
 * Wishlist for a logged-out visitor, keyed by the anonymous guest-id cookie
 * instead of a userId. Separate from `Wishlist` for the same reason as
 * `GuestCart` — see guest-cart.model.ts. Merged into the real `Wishlist` via
 * `WishlistService.addProduct` on login/signup, then deleted.
 */
export interface IGuestWishlist {
  _id?: mongoose.Types.ObjectId;
  guestId: string;
  products: IWishlistItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IGuestWishlistDocument = IGuestWishlist & Document;

const GuestWishlistSchema = new Schema<IGuestWishlistDocument>(
  {
    guestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          required: true,
          refPath: "products.productType",
        },
        productType: {
          type: String,
          required: true,
          enum: Object.values(ProductTypeEnum),
        },
      },
    ],
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

GuestWishlistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export async function getGuestWishlistModel(): Promise<
  Model<IGuestWishlistDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.GuestWishlist as Model<IGuestWishlistDocument>) ||
    mongoose.model<IGuestWishlistDocument>(
      "GuestWishlist",
      GuestWishlistSchema,
    )
  );
}
