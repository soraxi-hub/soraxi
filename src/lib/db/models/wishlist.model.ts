import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * Represents a single item in a user's wishlist.
 */
export interface IWishlistItem {
  productId: mongoose.Types.ObjectId;
  productType: "Product" | "digitalproducts";
}

/**
 * Wishlist document interface
 * Each user has a unique wishlist containing various product types.
 */
export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  products: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose schema for user wishlists
 * Stores product references (polymorphic: physical or digital) in subdocuments.
 */
const WishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          required: true,
          refPath: "products.productType", // Dynamic reference based on productType
        },
        productType: {
          type: String,
          required: true,
          enum: ["Product", "digitalproducts"],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * Get the Wishlist model
 * Uses a cached model if available to prevent model redefinition during development
 *
 * @returns Mongoose Wishlist model
 */
export async function getWishlistModel(): Promise<Model<IWishlist>> {
  await connectToDatabase();

  return (
    (mongoose.models.Wishlist as Model<IWishlist>) ||
    mongoose.model<IWishlist>("Wishlist", WishlistSchema)
  );
}

/**
 * Get a wishlist by user ID
 *
 * @param userId - The ID of the user
 * @param lean - Whether to return a lean object
 * @returns Wishlist document or plain object
 */
export async function getWishlistByUserId(
  userId: string
): Promise<IWishlist | null> {
  await connectToDatabase();
  const Wishlist = await getWishlistModel();

  const wishlist = await Wishlist.findOne<IWishlist>({
    userId: userId,
  }).populate({
    path: "products.productId",
    select: "name price sizes images productType slug category rating",
  });
  // .lean();

  return wishlist;
}

/**
 * Get wishlist by MongoDB document ID
 *
 * @param id - Wishlist document ID
 * @param lean - Whether to return a lean object
 * @returns Wishlist document or plain object
 */
export async function getWishlistById(
  id: string,
  lean = false
): Promise<IWishlist | null> {
  await connectToDatabase();
  const Wishlist = await getWishlistModel();

  return lean ? Wishlist.findById(id).lean() : Wishlist.findById(id);
}

// Add to wishlist
export async function addItemToWishlist(
  userId: string,
  product: {
    productId: mongoose.Types.ObjectId;
    productType: "Product" | "digitalproducts";
  }
): Promise<IWishlist> {
  await connectToDatabase();
  const Wishlist = await getWishlistModel();

  let wishlist = await Wishlist.findOne({ userId: userId });

  if (!wishlist) {
    wishlist = new Wishlist({ userId: userId, products: [product] });
  } else {
    const alreadyInWishlist = wishlist.products.some(
      (item) =>
        item.productId.toString() === product.productId.toString() &&
        item.productType === product.productType
    );
    if (!alreadyInWishlist) {
      wishlist.products.push(product);
    }
  }

  return await wishlist.save();
}

// Remove from wishlist
export async function removeItemFromWishlist(
  userId: string,
  productId: string
): Promise<IWishlist | null> {
  await connectToDatabase();
  const Wishlist = await getWishlistModel();

  return Wishlist.findOneAndUpdate(
    { userId: userId },
    {
      $pull: {
        products: { productId: new mongoose.Types.ObjectId(productId) },
      },
    },
    { new: true }
  );
}
