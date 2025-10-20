import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import {
  getCartByUserId,
  addItemToCart,
  removeItemFromCart,
  updateCartItemQuantity,
  addIdempotencyKeyToCart,
  ICartItem,
} from "@/lib/db/models/cart.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { getProductModel } from "@/lib/db/models/product.model";
import { generateUniqueId } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { ProductTypeEnum } from "@/validators/product-validators";

export const cartRouter = createTRPCRouter({
  /**
   * @procedure Get Cart by User ID
   * @description Fetches the authenticated user's cart with all items.
   * @throws {TRPCError} If user is not authenticated or cart not found.
   */
  getByUserId: baseProcedure.query(async ({ ctx }) => {
    try {
      const { user } = ctx;

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const cart = await getCartByUserId(user.id);
      if (!cart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Cart for user ${user.id} not found.`,
        });
      }

      const formattedCart = {
        userId: cart.userId.toString(),
        items: cart.items.map((item) => ({
          productId: item.productId.toString(),
          storeId: item.storeId.toString(),
          quantity: item.quantity,
          productType: item.productType,
          selectedSize: item.selectedSize,
        })),
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      };

      return formattedCart;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user cart",
        cause: error,
      });
    }
  }),

  /**
   * @procedure Cart Hydration
   * @description Fetches minimal cart items for quick frontend hydration.
   * Returns an empty array if user is not authenticated or has no cart.
   */
  cartHydration: baseProcedure.query(async ({ ctx }) => {
    try {
      const { user } = ctx;
      const emptyCartItems: ICartItem[] = [];

      if (!user) return emptyCartItems;

      const cart = await getCartByUserId(user.id);
      if (!cart) return emptyCartItems;

      const cartItems =
        cart.items.map((item) => ({
          productId: item.productId.toString(),
          storeId: item.storeId.toString(),
          quantity: item.quantity,
          productType: item.productType,
          selectedSize: item.selectedSize,
        })) || emptyCartItems;

      return cartItems;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to hydrate cart",
        cause: error,
      });
    }
  }),

  /**
   * @procedure Add Item to Cart
   * @description Adds a new product item to the user's cart.
   * @throws {TRPCError} If database operation fails.
   */
  addItem: baseProcedure
    .input(
      z.object({
        userId: z.string(),
        productId: z.string(),
        storeId: z.string(),
        quantity: z.number().min(1),
        productType: z.nativeEnum(ProductTypeEnum),
        selectedSize: z
          .object({
            size: z.string(),
            price: z.number(),
            quantity: z.number(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const updatedCart = await addItemToCart(input.userId, {
          productId: new mongoose.Types.ObjectId(input.productId),
          storeId: new mongoose.Types.ObjectId(input.storeId),
          quantity: input.quantity,
          productType: input.productType,
          selectedSize: input.selectedSize,
        });

        return updatedCart;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add item to cart",
          cause: error,
        });
      }
    }),

  /**
   * @procedure Remove Item from Cart
   * @description Removes a product (optionally by size) from the user's cart.
   * @throws {TRPCError} If user not authenticated or item not found.
   */
  removeItem: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        size: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        const updatedCart = await removeItemFromCart(
          user.id,
          input.productId,
          input.size
        );

        if (!updatedCart) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cart or item not found",
          });
        }

        return updatedCart;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove item from cart",
          cause: error,
        });
      }
    }),

  /**
   * @procedure Update Cart Item Quantity
   * @description Updates the quantity of a specific item in the cart.
   * If quantity is zero, removes the item.
   * @throws {TRPCError} If user not authenticated or item not found.
   */
  updateQuantity: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().min(0),
        size: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        if (input.quantity === 0) {
          const removed = await removeItemFromCart(
            user.id,
            input.productId,
            input.size
          );
          return removed;
        }

        const updatedCart = await updateCartItemQuantity(
          user.id,
          input.productId,
          input.quantity,
          input.size
        );

        if (!updatedCart) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Item to update not found in cart",
          });
        }

        return updatedCart;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update cart item quantity",
          cause: error,
        });
      }
    }),

  /**
   * @procedure Get Many Products by IDs
   * @description Fetches product details for a given list of product IDs.
   * @throws {TRPCError} If database query fails.
   */
  getManyByIds: baseProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .query(async ({ input }) => {
      try {
        const Product = await getProductModel();
        const products = await Product.find({
          _id: { $in: input.ids },
        }).lean();

        return products.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          slug: p.slug,
          image: (p.images && p.images[0]) || siteConfig.placeHolderImg,
          price: p.price,
          inStock: p.productQuantity && p.productQuantity > 0 ? true : false,
          maxQuantity: p.productQuantity,
          productType: p.productType,
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch product details",
          cause: error,
        });
      }
    }),

  /**
   * @procedure Add Idempotency Key to Cart
   * @description Adds a unique idempotency key to the user's cart to prevent duplicate checkouts.
   * @throws {TRPCError} If user not authenticated or cart not found.
   */
  addIdempotencyKey: baseProcedure.mutation(async ({ ctx }) => {
    try {
      const { user } = ctx;

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User must be logged in to add idempotency key",
        });
      }

      const idempotencyKey = `IDK-${generateUniqueId(12).toUpperCase()}`;

      const updatedCart = await addIdempotencyKeyToCart(
        user.id,
        idempotencyKey
      );

      if (!updatedCart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cart not found",
        });
      }

      return updatedCart;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to add idempotency key",
        cause: error,
      });
    }
  }),
});
