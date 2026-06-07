import mongoose from "mongoose";
import {
  getWishlistModel,
  IWishlist,
  IWishlistDocument,
} from "@/lib/db/models/wishlist.model";
import { ProductTypeEnum } from "@/enums";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { Wishlist } from "@/domain/wishlist/wishlist";

/**
 * Repository responsible for database interactions.
 */
export class WishlistRepository {
  /**
   * Finds wishlist by user ID.
   */
  static async findByUserId(userId: string): Promise<IWishlist | null> {
    const WishlistModel = await getWishlistModel();

    return await QueryBuilderFactory.queryBuilder<IWishlist, IWishlistDocument>(
      WishlistModel,
    )
      .where("userId", new mongoose.Types.ObjectId(userId))
      // .populate({
      //   path: "products.productId",
      //   select: "name price sizes images productType slug category rating",
      // })
      .executeOne();
  }

  /**
   * Finds wishlist by document ID.
   */
  static async findById(wishlistId: string): Promise<IWishlist | null> {
    const WishlistModel = await getWishlistModel();

    return await QueryBuilderFactory.queryBuilder<IWishlist, IWishlistDocument>(
      WishlistModel,
    )
      .where("_id", new mongoose.Types.ObjectId(wishlistId))
      .executeOne();
  }

  /**
   * Creates a new wishlist.
   */
  static async create(data: {
    userId: string;
    products?: {
      productId: mongoose.Types.ObjectId;
      productType: ProductTypeEnum;
    }[];
  }): Promise<IWishlistDocument> {
    const WishlistModel = await getWishlistModel();

    return WishlistModel.create({
      ...data,
      userId: new mongoose.Types.ObjectId(data.userId),
    });
  }

  /**
   * Saves changes to an existing wishlist document.
   */
  static async save(wishlist: Wishlist): Promise<IWishlistDocument | null> {
    const WishlisttModel = await getWishlistModel();

    return await WishlisttModel.findByIdAndUpdate(
      wishlist.WishlistId,
      {
        products: wishlist.products,
      },
      {
        new: true,
      },
    );
  }

  /**
   * Deletes a wishlist.
   */
  static async deleteByUserId(userId: string): Promise<void> {
    const WishlistModel = await getWishlistModel();

    await WishlistModel.findOneAndDelete({ userId });
  }
}
