import { Cart } from "@/domain/cart/cart";
import { CartFactory } from "@/domain/cart/cart-factory";
import {
  CartValidationResult,
  ICartItemInfo,
  IPopulatedCartInfo,
} from "@/domain/cart/cart-interface";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { StoreStatusEnum } from "@/enums";
import { getCartModel, ICart } from "@/lib/db/models/cart.model";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { AppError } from "@/lib/errors/app-error";
import { CartRepository } from "@/repositories/cart-repo";
import { ProductRepository } from "@/repositories/product-repo";
import mongoose from "mongoose";

export class CartService {
  static async addToCart(userId: string, item: ICartItemInfo): Promise<Cart> {
    try {
      let existingCart = await CartRepository.getCartByUserId(userId);

      if (!existingCart) {
        existingCart = await CartRepository.create({
          userId: new mongoose.Types.ObjectId(userId),
          items: [],
        });
      }

      const cart = CartFactory.createCart({
        ...existingCart,
        _id: existingCart._id?.toString(),
        userId: existingCart.userId.toString(),
      });

      cart.addToCart(item);
      await CartRepository.save(cart);

      return cart;
    } catch (error) {
      if (error instanceof AppError) {
        // Rethrow error
        throw error;
      }

      throw new Error("Cart not found");
    }
  }

  static async removeFromCart(
    userId: string,
    productId: string,
  ): Promise<Cart> {
    try {
      const existingCartData = await CartRepository.getCartByUserId(userId);

      if (!existingCartData) throw new AppError("Cart not found", 400);

      const cart = CartFactory.createCart({
        ...existingCartData,
        _id: existingCartData._id?.toString(),
        userId: existingCartData.userId?.toString(),
      });

      cart.removeFromCart(productId);

      await CartRepository.save(cart);

      return cart;
    } catch (error) {
      if (error instanceof AppError) {
        // Rethrow error
        throw error;
      }

      throw new Error("Cart not found");
    }
  }

  static async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<Cart> {
    try {
      const existingCartData = await CartRepository.getCartByUserId(userId);

      if (!existingCartData) throw new AppError("Cart not found", 400);

      const cart = CartFactory.createCart({
        ...existingCartData,
        _id: existingCartData._id?.toString(),
        userId: existingCartData.userId?.toString(),
      });

      cart.updateItemQuantity(productId, quantity);

      await CartRepository.save(cart);

      return cart;
    } catch (error) {
      if (error instanceof AppError) {
        // Rethrow error
        throw error;
      }

      throw new Error("Cart not found");
    }
  }

  static async addIdempotencyKey(
    userId: string,
    key: string,
  ): Promise<ICart | null> {
    return await CartRepository.addIdempotencyKeyToCart(userId, key);
  }

  static async clearCart(userId: string): Promise<void> {
    try {
      await CartRepository.clearUserCart(userId);
    } catch (clearUserCartError) {
      console.error("Failed to clear user cart:", clearUserCartError);
    }
  }

  static async getPopulatedCart(userId: string): Promise<IPopulatedCartInfo> {
    const ProductModel = await getProductModel();

    // 1. Fetch raw cart (IDs only — domain stays pure)
    let rawCart = await CartRepository.getCartByUserId(userId);

    if (!rawCart) {
      // Don't throw any error rather create a cart for the user
      rawCart = await CartRepository.create({
        userId: new mongoose.Types.ObjectId(userId),
        items: [],
      });
    }

    // 2. Collect all productIds from the cart
    const productIds = rawCart.items.map((i) => i.productId);

    // 3. Fetch products in one query
    const products = await ProductModel.find({
      _id: { $in: productIds },
    })
      .select(
        "_id storeId price productType name productQuantity images sizes category status slug",
      )
      .lean<IProduct[]>();

    // 4. Decorate — Cart domain is untouched
    return CartFactory.buildPopulatedCart(rawCart, products);
  }

  /**
   * Retrieves a grouped cart for the authenticated user.
   * - Groups products by store
   * - Fetches shipping methods per store
   * - Calculates total price and quantity
   *
   * @param userId - Authenticated user's ID
   */
  static async getGroupedCart(userId: string) {
    const CartModel = await getCartModel();
    const StoreModel = await getStoreModel();

    // Fetch raw cart
    const cart = await QueryBuilderFactory.queryBuilder<ICart>(CartModel)
      .where("userId", new mongoose.Types.ObjectId(userId))
      .executeOne();

    // Empty cart fallback
    if (!cart || cart.items.length === 0) {
      return {
        success: true,
        totalQuantity: 0,
        totalPrice: 0,
        groupedCart: [],
      };
    }

    /**
     * Fetch products separately
     * Placeholder:
     * Replace this with your actual repository/service call
     */
    const productIds = cart.items.map((item) => item.productId);

    const products = await ProductRepository.findManyByIds(productIds);

    /**
     * Create populated cart instance
     */
    const populatedCart = CartFactory.buildPopulatedCart(cart, products);

    /**
     * Shipping methods grouped by store
     */
    const storeShipping: Record<
      string,
      {
        name: string;
        shippingMethods: {
          name: string;
          price: number;
          estimatedDeliveryDays?: number;
          isActive?: boolean;
          description?: string;
        }[];
      }
    > = {};

    /**
     * Use new getter from PopulatedCart
     */
    for (const storeId of populatedCart.storeIds) {
      const store = await StoreModel.findById(storeId).select(
        "name shippingMethods",
      );

      if (store) {
        storeShipping[storeId] = {
          name: store.name,
          shippingMethods: store.shippingMethods,
        };
      }
    }

    /**
     * Use groupedCart getter from PopulatedCart
     */
    const groupedCart = populatedCart.groupedCart.map((group) => ({
      storeId: group.storeId,

      storeName:
        storeShipping[group.storeId]?.name ||
        `Store ${group.storeId.slice(0, 5)}`,

      products: group.products,

      shippingMethods: storeShipping[group.storeId]?.shippingMethods || [],
    }));

    return {
      success: true,

      // Comes from PopulatedCart
      totalQuantity: populatedCart.productCount,

      // Comes from PopulatedCart
      totalPrice: populatedCart.subtotal,

      groupedCart,
    };
  }

  /**
   * Group products by their store and validate that:
   * - All products still exist and have enough stock
   * - The store is active (not suspended, pending, or rejected)
   *
   * @param userId - Authenticated user's ID
   */
  static async validateUserCart(userId: string): Promise<CartValidationResult> {
    const CartModel = await getCartModel();
    const StoreModel = await getStoreModel();

    /**
     * Fetch raw cart
     */
    const cart = await QueryBuilderFactory.queryBuilder<ICart>(CartModel)
      .where("userId", new mongoose.Types.ObjectId(userId))
      .executeOne();

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    const productIds = cart.items.map((item) => item.productId);

    const products = await ProductRepository.findManyByIds(productIds);

    /**
     * Create populated cart
     */
    const populatedCart = CartFactory.buildPopulatedCart(cart, products);

    /**
     * Start with cart-level validation
     */
    const validationErrors = [...populatedCart.validationErrors];

    /**
     * Validate stores
     */
    const stores = await StoreModel.find({
      _id: {
        $in: populatedCart.storeIds.map(
          (id) => new mongoose.Types.ObjectId(id),
        ),
      },
    })
      .select("status name")
      .lean();

    const storeMap = new Map(
      stores.map((store) => [store._id.toString(), store]),
    );

    for (const storeId of populatedCart.storeIds) {
      const store = storeMap.get(storeId);

      if (!store) {
        validationErrors.push("One of the selected stores could not be found.");

        continue;
      }

      if (store.status !== StoreStatusEnum.Active) {
        validationErrors.push(
          `The store "${store.name}" is not active and cannot accept new orders.`,
        );
      }
    }

    return {
      success: true,
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }
}
