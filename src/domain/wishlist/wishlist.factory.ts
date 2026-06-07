import { IProduct } from "@/lib/db/models/product.model";
import { PopulatedWishlist } from "./decorators/populated-wishlist.decorator";
import { Wishlist } from "./wishlist";
import { IWishlistInfo } from "./wishlist.interface";
import { IWishlist } from "@/lib/db/models/wishlist.model";

/**
 * Factory responsible for transforming wishlist data
 * between persistence and domain layers.
 */
export class WishlistFactory {
  /**
   * Creates a Wishlist domain entity.
   */
  static create(data: IWishlistInfo): Wishlist {
    return new Wishlist(data);
  }

  /**
   * Creates Wishlist entity from MongoDB document.
   */
  static fromPersistence(doc: IWishlist): Wishlist {
    if (!doc._id) throw new Error("Wishlist ID required");

    return new Wishlist({
      _id: doc._id.toString(),
      userId: doc.userId.toString(),
      products: doc.products.map((item) => ({
        productId: item.productId.toString(),
        productType: item.productType,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  static buildWishlistWithPolulatedProduct(
    data: IWishlistInfo,
    products: IProduct[],
  ): PopulatedWishlist {
    // console.log("wishlistItems", data);
    return new PopulatedWishlist(data, products);
  }
}
