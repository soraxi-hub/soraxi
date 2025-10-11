import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import {
  getCartByUserId,
  addItemToCart,
  removeItemFromCart,
  updateCartItemQuantity,
  addIdempotencyKeyToCart,
} from "@/lib/db/models/cart.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { getProductModel } from "@/lib/db/models/product.model";
import { generateUniqueId } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { ProductTypeEnum } from "@/validators/product-validators";

export const cartRouter = createTRPCRouter({
  // ✅ Get cart by user ID
  getByUserId: baseProcedure.query(async ({ ctx }) => {
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

    const formatedCart = {
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

    return formatedCart;
  }),

  // ✅ Add item to cart
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
      const updatedCart = await addItemToCart(input.userId, {
        productId: new mongoose.Types.ObjectId(input.productId),
        storeId: new mongoose.Types.ObjectId(input.storeId),
        quantity: input.quantity,
        productType: input.productType,
        selectedSize: input.selectedSize,
      });

      return updatedCart;
    }),

  // ✅ Remove item from cart
  removeItem: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        size: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
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
    }),

  // ✅ Update quantity of item
  updateQuantity: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        quantity: z.number().min(0), // 0 means remove
        size: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // console.log("userid", input.userId);
      // console.log("productid", input.productId);
      // console.log("qty", input.quantity);
      // console.log("size", input.size);
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
    }),

  getManyByIds: baseProcedure
    .input(z.object({ ids: z.array(z.string()) })) // list of productIds
    .query(async ({ input }) => {
      const Product = await getProductModel();
      const products = await Product.find({
        _id: { $in: input.ids },
      }).lean();

      return products.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        image: (p.images && p.images[0]) || siteConfig.placeHolderImg1,
        price: p.price,
        // originalPrice: p.originalPrice,
        inStock: p.productQuantity && p.productQuantity > 0 ? true : false,
        // storeName: "TODO", // Optional: populate store if needed
        maxQuantity: p.productQuantity,
        productType: p.productType,
      }));
    }),

  /**
   * Procedure for adding idempotency key to cart
   * This can help prevent duplicate charges during checkout
   */
  addIdempotencyKey: baseProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    try {
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
