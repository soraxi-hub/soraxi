import { Cart } from "@/domain/cart/cart";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { getCartModel, ICart, ICartDocument } from "@/lib/db/models/cart.model";
import mongoose from "mongoose";

export class CartRepository {
  static async create(data: Partial<ICart>) {
    const CartModel = await getCartModel();

    return CartModel.create(data);
  }

  /**
   * Get cart by user ID
   *
   * @param userId - MongoDB ObjectId of the user
   * @param lean - Whether to return a lean plain object
   * @returns Cart document or plain object
   */
  static async getCartByUserId(userId: string) {
    const CartModel = await getCartModel();

    return await QueryBuilderFactory.queryBuilder<ICart>(CartModel)
      .where("userId", new mongoose.Types.ObjectId(userId))
      .executeOne();
  }

  /**
   * Get cart by document ID
   *
   * @param id - MongoDB ObjectId of the cart document
   * @param lean - Whether to return a lean plain object
   * @returns Cart document or plain object
   */
  static async getCartById(id: string, lean = false): Promise<ICart | null> {
    const CartModel = await getCartModel();

    return lean
      ? CartModel.findById<ICart>(id).lean<ICart>()
      : CartModel.findById<ICartDocument>(id);
  }

  static async save(cart: Cart) {
    const CartModel = await getCartModel();

    return CartModel.findByIdAndUpdate(
      cart.cartId,
      {
        items: cart.items.map((item) => ({
          ...item,
          storeId: new mongoose.Types.ObjectId(item.storeId),
          productId: new mongoose.Types.ObjectId(item.productId),
        })),
      },
      {
        new: true,
      },
    );
  }

  /**
   * Clear all items from a user's cart
   *
   * @param userId - User's ObjectId
   * @returns Updated empty cart document or null if cart doesn't exist
   */
  static async clearUserCart(userId: string): Promise<ICart | null> {
    const CartModel = await getCartModel();

    return await CartModel.findOneAndUpdate<ICart>(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { items: [] } }, // Set items array to empty
      { new: true }, // Return the updated document
    );
  }

  /**
   * Add idempotency key to a user's cart
   *
   * This key can be used to prevent duplicate operations (e.g., during checkout).
   */
  static async addIdempotencyKeyToCart(
    userId: string,
    idempotencyKey: string,
  ): Promise<ICart | null> {
    const CartModel = await getCartModel();

    return await CartModel.findOneAndUpdate<ICart>(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { idempotencyKey } },
      { new: true },
    );
  }
}
