import mongoose from "mongoose";
import { ProductTypeEnum } from "@/enums";
import { PublicToJSON } from "../products/product-interface";

/**
 * Represents a single wishlist item.
 */
export interface IWishlistItemInfo {
  productId: mongoose.Types.ObjectId | string;
  productType: ProductTypeEnum;
}

/**
 * Base wishlist interface used across the domain layer.
 */
export interface IWishlistInfo {
  _id?: string;
  userId: mongoose.Types.ObjectId | string;
  products: IWishlistItemInfo[];
  createdAt?: Date;
  updatedAt?: Date;
}

// New interface for the enriched version
export interface IPopulatedWishlistItemInfo extends IWishlistItemInfo {
  productData: PublicToJSON;
}

export interface IPopulatedWishlistInfo
  extends Omit<IWishlistInfo, "products"> {
  products: IPopulatedWishlistItemInfo[];
}
