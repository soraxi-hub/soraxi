import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { ProductTypeEnum } from "@/validators/product-validators";

/**
 * Interface for a single item in the cart
 * Each item holds a product reference, quantity, and optional size details.
 */
export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  storeId: mongoose.Types.ObjectId;
  quantity: number;
  productType: ProductTypeEnum;
  selectedSize?: {
    size: string;
    price: number;
    quantity: number;
  };
}

/**
 * Interface for the Cart document
 * Represents a user's shopping cart with polymorphic product support.
 */
export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
  idempotencyKey?: string;
}

/**
 * Schema for a single cart item
 * Supports products from different stores and types, with optional sizing.
 */
const CartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      refPath: "items.productType", // Dynamic reference based on productType
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
  { _id: false } // Prevents Mongoose from auto-creating an _id for subdocuments
);

/**
 * Mongoose schema for the Cart
 * Associates a single cart with a user and their product selections.
 */
const CartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true,
    },
    items: [CartItemSchema],
    idempotencyKey: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Get the Cart model
 * Uses a cached model if available to avoid re-compilation in development
 *
 * @returns Mongoose Cart model
 */
export async function getCartModel(): Promise<Model<ICart>> {
  await connectToDatabase();

  return (
    (mongoose.models.Cart as Model<ICart>) ||
    mongoose.model<ICart>("Cart", CartSchema)
  );
}

/**
 * Get cart by user ID
 *
 * @param userId - MongoDB ObjectId of the user
 * @param lean - Whether to return a lean plain object
 * @returns Cart document or plain object
 */
export async function getCartByUserId(
  userId: string,
  lean = false
): Promise<ICart | null> {
  await connectToDatabase();
  const Cart = await getCartModel();

  return lean
    ? Cart.findOne<ICart>({ userId: userId }).lean<ICart>()
    : Cart.findOne<ICart>({ userId: userId });
}

/**
 * Get cart by document ID
 *
 * @param id - MongoDB ObjectId of the cart document
 * @param lean - Whether to return a lean plain object
 * @returns Cart document or plain object
 */
export async function getCartById(
  id: string,
  lean = false
): Promise<ICart | null> {
  await connectToDatabase();
  const Cart = await getCartModel();

  return lean
    ? Cart.findById<ICart>(id).lean<ICart>()
    : Cart.findById<ICart>(id);
}

/**
 * Add an item to a user's cart
 *
 * If the item (same product ID and selected size) already exists, its quantity is increased.
 *
 * @param userId - User's ObjectId
 * @param newItem - Item to add
 */
export async function addItemToCart(
  userId: string,
  newItem: ICartItem
): Promise<ICart> {
  await connectToDatabase();
  const Cart = await getCartModel();

  // const query = {
  //   userId: userId,
  //   "items.productId": newItem.product,
  //   ...(newItem.selectedSize?.size && {
  //     "items.selectedSize.size": newItem.selectedSize.size,
  //   }),
  // };

  const existingCart = await Cart.findOne<ICart>({
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!existingCart) {
    // Create new cart
    return await Cart.create({
      userId: new mongoose.Types.ObjectId(userId),
      items: [newItem],
    });
  }

  const itemIndex = existingCart.items.findIndex(
    (item) =>
      item.productId.toString() === newItem.productId.toString() &&
      item.selectedSize?.size === newItem.selectedSize?.size
  );

  if (itemIndex > -1) {
    // If item exists, update quantity
    existingCart.items[itemIndex].quantity += newItem.quantity;
  } else {
    // If not, add new item
    existingCart.items.push(newItem);
  }

  return await existingCart.save();
}

/**
 * Remove an item from a user's cart
 *
 * Removes based on product ID and (optionally) size if provided.
 *
 * @param userId - User's ObjectId
 * @param productId - ID of the product to remove
 * @param size - Optional size if item has variants
 */
export async function removeItemFromCart(
  userId: string,
  productId: string,
  size?: string
): Promise<ICart | null> {
  await connectToDatabase();
  const Cart = await getCartModel();

  const updateQuery = size
    ? { $pull: { items: { productId: productId, "selectedSize.size": size } } }
    : { $pull: { items: { productId: productId } } };

  return await Cart.findOneAndUpdate<ICart>({ userId: userId }, updateQuery, {
    new: true,
  });
}

/**
 * Update quantity of a specific item in the user's cart
 *
 * @param userId - User's ObjectId
 * @param productId - ID of the product
 * @param quantity - New quantity to set
 * @param size - Optional size if applicable
 */
export async function updateCartItemQuantity(
  userId: string,
  productId: string,
  quantity: number,
  size?: string
): Promise<ICart | null> {
  await connectToDatabase();
  const Cart = await getCartModel();

  const cart = await Cart.findOne<ICart>({ userId: userId });
  if (!cart) return null;

  const item = cart.items.find(
    (item) =>
      item.productId.toString() === productId &&
      (!size || item.selectedSize?.size === size)
  );

  if (!item) return null;

  item.quantity = quantity;

  return await cart.save();
}

/**
 * Clear all items from a user's cart
 *
 * @param userId - User's ObjectId
 * @returns Updated empty cart document or null if cart doesn't exist
 */
export async function clearUserCart(userId: string): Promise<ICart | null> {
  await connectToDatabase();
  const Cart = await getCartModel();

  return await Cart.findOneAndUpdate<ICart>(
    { userId: new mongoose.Types.ObjectId(userId) },
    { $set: { items: [] } }, // Set items array to empty
    { new: true } // Return the updated document
  );
}

/**
 * Add idempotency key to a user's cart
 *
 * This key can be used to prevent duplicate operations (e.g., during checkout).
 */
export async function addIdempotencyKeyToCart(
  userId: string,
  idempotencyKey: string
): Promise<ICart | null> {
  await connectToDatabase();
  const Cart = await getCartModel();

  return await Cart.findOneAndUpdate<ICart>(
    { userId: userId },
    { $set: { idempotencyKey } },
    { new: true }
  );
}
