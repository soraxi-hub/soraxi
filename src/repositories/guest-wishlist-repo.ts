import mongoose from "mongoose";
import {
  getGuestWishlistModel,
  IGuestWishlist,
  IGuestWishlistDocument,
} from "@/lib/db/models/guest-wishlist.model";
import { ProductTypeEnum } from "@/enums";

export interface GuestWishlistItemInput {
  productId: string;
  productType: ProductTypeEnum;
}

/**
 * Plain Mongoose access for GuestWishlist — same reasoning as
 * GuestCartRepository: short-lived, throwaway data, no domain layer needed.
 */
export class GuestWishlistRepository {
  static async findByGuestId(
    guestId: string,
  ): Promise<IGuestWishlistDocument | null> {
    const GuestWishlist = await getGuestWishlistModel();
    return GuestWishlist.findOne({ guestId });
  }

  /** Dedupes on productId + productType — mirrors `Wishlist.addProduct`. */
  static async addItem(
    guestId: string,
    item: GuestWishlistItemInput,
  ): Promise<IGuestWishlistDocument> {
    const GuestWishlist = await getGuestWishlistModel();
    let wishlist = await GuestWishlist.findOne({ guestId });

    if (!wishlist) {
      wishlist = new GuestWishlist({ guestId, products: [] });
    }

    const alreadyExists = wishlist.products.some(
      (existing) =>
        existing.productId.toString() === item.productId &&
        existing.productType === item.productType,
    );

    if (!alreadyExists) {
      wishlist.products.push({
        productId: new mongoose.Types.ObjectId(item.productId),
        productType: item.productType,
      });
    }

    await wishlist.save();
    return wishlist;
  }

  static async removeItem(
    guestId: string,
    productId: string,
  ): Promise<IGuestWishlistDocument | null> {
    const GuestWishlist = await getGuestWishlistModel();
    return GuestWishlist.findOneAndUpdate(
      { guestId },
      {
        $pull: {
          products: { productId: new mongoose.Types.ObjectId(productId) },
        },
      },
      { new: true },
    );
  }

  static async deleteByGuestId(guestId: string): Promise<void> {
    const GuestWishlist = await getGuestWishlistModel();
    await GuestWishlist.findOneAndDelete({ guestId });
  }
}

export type { IGuestWishlist };
