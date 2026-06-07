import mongoose from "mongoose";
import { ProductTypeEnum } from "@/enums";
import { WishlistFactory } from "@/domain/wishlist/wishlist.factory";
import { WishlistRepository } from "@/repositories/wishlist.repository";
import { Wishlist } from "@/domain/wishlist/wishlist";
import { getProductModel } from "@/lib/db/models/product.model";
import { PopulatedWishlist } from "@/domain/wishlist/decorators/populated-wishlist.decorator";

/**
 * Service layer responsible for wishlist business logic.
 */
export class WishlistService {
  /**
   * Retrieves a user's wishlist.
   */
  static async getUserWishlist(userId: string): Promise<Wishlist | null> {
    const wishlistDoc = await WishlistRepository.findByUserId(userId);

    if (!wishlistDoc) {
      return null;
    }

    return WishlistFactory.fromPersistence(wishlistDoc);
  }

  /**
   * Retrieves a user's wishlist.
   */
  static async getUserWishlistWithPopulatedProducts(
    userId: string,
  ): Promise<PopulatedWishlist | null> {
    const ProductModel = await getProductModel();
    const wishlistDoc = await WishlistRepository.findByUserId(userId);

    if (!wishlistDoc) {
      return null;
    }

    const productIds = wishlistDoc.products.map((p) => p.productId);

    const products = await ProductModel.find({
      _id: { $in: productIds },
    }).select("price productType name images status slug category rating");

    return WishlistFactory.buildWishlistWithPolulatedProduct(
      { ...wishlistDoc, _id: wishlistDoc._id?.toString() },
      products,
    );
  }

  /**
   * Creates a wishlist if none exists.
   */
  static async createWishlist(userId: string): Promise<Wishlist> {
    const existingWishlist = await WishlistRepository.findByUserId(userId);

    if (existingWishlist) {
      return WishlistFactory.fromPersistence(existingWishlist);
    }

    const wishlist = await WishlistRepository.create({
      userId,
      products: [],
    });

    return WishlistFactory.fromPersistence(wishlist);
  }

  /**
   * Adds a product to user's wishlist.
   */
  static async addProduct(
    userId: string,
    product: {
      productId: string;
      productType: ProductTypeEnum;
    },
  ): Promise<Wishlist> {
    let wishlistDoc = await WishlistRepository.findByUserId(userId);

    if (!wishlistDoc) {
      wishlistDoc = await WishlistRepository.create({
        userId,
        products: [
          {
            productId: new mongoose.Types.ObjectId(product.productId),
            productType: product.productType,
          },
        ],
      });

      return WishlistFactory.fromPersistence(wishlistDoc);
    }

    const wishlist = WishlistFactory.fromPersistence(wishlistDoc);

    wishlist.addProduct({
      productId: new mongoose.Types.ObjectId(product.productId),
      productType: product.productType,
    });

    await WishlistRepository.save(wishlist);

    return wishlist;
  }

  /**
   * Removes a product from wishlist.
   */
  static async removeProduct(
    userId: string,
    productId: string,
  ): Promise<Wishlist | null> {
    const wishlistDoc = await WishlistRepository.findByUserId(userId);

    if (!wishlistDoc) {
      return null;
    }

    const wishlist = WishlistFactory.fromPersistence(wishlistDoc);

    wishlist.removeProduct(productId);

    await WishlistRepository.save(wishlist);

    return wishlist;
  }

  /**
   * Checks whether a product exists in user's wishlist.
   */
  static async isInWishlist(
    userId: string,
    productId: string,
    productType: ProductTypeEnum,
  ): Promise<boolean> {
    const wishlistDoc = await WishlistRepository.findByUserId(userId);

    if (!wishlistDoc) {
      return false;
    }

    const wishlist = WishlistFactory.fromPersistence(wishlistDoc);

    return wishlist.hasProduct(productId, productType);
  }

  /**
   * Clears all wishlist products.
   */
  static async clearWishlist(userId: string): Promise<void> {
    const wishlistDoc = await WishlistRepository.findByUserId(userId);

    if (!wishlistDoc) {
      return;
    }

    const wishlist = WishlistFactory.fromPersistence(wishlistDoc);

    wishlist.clearProducts();

    await WishlistRepository.save(wishlist);
  }
}
