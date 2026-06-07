import mongoose from "mongoose";
import { ProductTypeEnum } from "@/enums";
import { IWishlistInfo, IWishlistItemInfo } from "./wishlist.interface";

/**
 * Domain entity representing a user's wishlist.
 */
export class Wishlist {
  constructor(protected data: IWishlistInfo) {}

  /**
   * Returns wishlist ID.
   */
  get WishlistId(): string | undefined {
    return this.data._id?.toString();
  }

  /**
   * Returns owner user ID.
   */
  get userId(): string {
    return this.data.userId.toString();
  }

  /**
   * Returns all wishlist products.
   */
  get products(): IWishlistItemInfo[] {
    return this.data.products;
  }

  /**
   * Checks whether a product already exists in wishlist.
   */
  hasProduct(productId: string, productType: ProductTypeEnum): boolean {
    return this.data.products.some(
      (item) =>
        item.productId.toString() === productId &&
        item.productType === productType,
    );
  }

  /**
   * Adds a product to wishlist if not already existing.
   */
  addProduct(item: IWishlistItemInfo): void {
    const exists = this.hasProduct(item.productId.toString(), item.productType);

    if (!exists) {
      this.data.products.push(item);
    }
  }

  /**
   * Removes a product from wishlist.
   */
  removeProduct(productId: string): void {
    this.data.products = this.data.products.filter(
      (item) => item.productId.toString() !== productId,
    );
  }

  clearProducts(): void {
    this.data.products = [];
  }

  /**
   * Returns wishlist as a plain object.
   */
  toObject(): IWishlistInfo {
    return {
      _id: this.data._id,
      userId: this.data.userId,
      products: this.data.products,
      createdAt: this.data.createdAt,
      updatedAt: this.data.updatedAt,
    };
  }

  /**
   * Converts wishlist to persistence-ready payload.
   */
  toPersistence(): Omit<IWishlistInfo, "_id"> {
    return {
      userId: new mongoose.Types.ObjectId(this.data.userId),
      products: this.data.products.map((item) => ({
        productId: new mongoose.Types.ObjectId(item.productId.toString()),
        productType: item.productType,
      })),
      // createdAt: this.data.createdAt,
      // updatedAt: this.data.updatedAt,
    };
  }
}
