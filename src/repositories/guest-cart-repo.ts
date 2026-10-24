import mongoose from "mongoose";
import {
  getGuestCartModel,
  IGuestCart,
  IGuestCartDocument,
} from "@/lib/db/models/guest-cart.model";
import { ProductTypeEnum } from "@/enums";

export interface GuestCartItemInput {
  productId: string;
  storeId: string;
  quantity: number;
  productType: ProductTypeEnum;
  selectedSize?: { size: string; price: number; quantity: number };
}

/**
 * Plain Mongoose access for GuestCart — intentionally without the
 * domain/factory layering around the production Cart, since guest data is
 * short-lived and throwaway (see guest-cart.model.ts).
 */
export class GuestCartRepository {
  static async findByGuestId(
    guestId: string,
  ): Promise<IGuestCartDocument | null> {
    const GuestCart = await getGuestCartModel();
    return GuestCart.findOne({ guestId });
  }

  /**
   * Adds an item, summing quantity when the same product + size already
   * exists — mirrors `Cart.addToCart`'s dedupe rule exactly.
   */
  static async addItem(
    guestId: string,
    item: GuestCartItemInput,
  ): Promise<IGuestCartDocument> {
    const GuestCart = await getGuestCartModel();
    let cart = await GuestCart.findOne({ guestId });

    if (!cart) {
      cart = new GuestCart({ guestId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (existing) =>
        existing.productId.toString() === item.productId &&
        existing.selectedSize?.size === item.selectedSize?.size,
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += item.quantity;
    } else {
      cart.items.push({
        ...item,
        productId: new mongoose.Types.ObjectId(item.productId),
        storeId: new mongoose.Types.ObjectId(item.storeId),
      });
    }

    await cart.save();
    return cart;
  }

  static async removeItem(
    guestId: string,
    productId: string,
  ): Promise<IGuestCartDocument | null> {
    const GuestCart = await getGuestCartModel();
    return GuestCart.findOneAndUpdate(
      { guestId },
      { $pull: { items: { productId: new mongoose.Types.ObjectId(productId) } } },
      { new: true },
    );
  }

  static async updateQuantity(
    guestId: string,
    productId: string,
    quantity: number,
  ): Promise<IGuestCartDocument | null> {
    const GuestCart = await getGuestCartModel();
    return GuestCart.findOneAndUpdate(
      { guestId, "items.productId": new mongoose.Types.ObjectId(productId) },
      { $set: { "items.$.quantity": quantity } },
      { new: true },
    );
  }

  static async deleteByGuestId(guestId: string): Promise<void> {
    const GuestCart = await getGuestCartModel();
    await GuestCart.findOneAndDelete({ guestId });
  }
}

export type { IGuestCart };
