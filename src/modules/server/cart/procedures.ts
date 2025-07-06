import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import {
  getCartByUserId,
  addItemToCart,
  removeItemFromCart,
  updateCartItemQuantity,
} from "@/lib/db/models/cart.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { getProductModel } from "@/lib/db/models/product.model";

export const cartRouter = createTRPCRouter({
  // ✅ Get cart by user ID
  getByUserId: baseProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const cart = await getCartByUserId(input.userId);
      if (!cart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Cart for user ${input.userId} not found.`,
        });
      }

      const formatedCart = {
        user: cart.user,
        items: cart.items.map((item) => ({
          product: item.product,
          storeID: item.storeID,
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
        product: z.string(),
        storeID: z.string(),
        quantity: z.number().min(1),
        productType: z.enum(["Product", "digitalproducts"]),
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
        product: new mongoose.Types.ObjectId(input.product),
        storeID: new mongoose.Types.ObjectId(input.storeID),
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
        userId: z.string(),
        productId: z.string(),
        size: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updatedCart = await removeItemFromCart(
        input.userId,
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
        userId: z.string(),
        productId: z.string(),
        quantity: z.number().min(0), // 0 means remove
        size: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // console.log("userid", input.userId);
      // console.log("productid", input.productId);
      // console.log("qty", input.quantity);
      // console.log("size", input.size);
      if (input.quantity === 0) {
        const removed = await removeItemFromCart(
          input.userId,
          input.productId,
          input.size
        );
        return removed;
      }

      const updatedCart = await updateCartItemQuantity(
        input.userId,
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
        image: p.images[0] ?? "/placeholder.png",
        price: p.price,
        // originalPrice: p.originalPrice,
        inStock: p.productQuantity > 0 ? true : false,
        // storeName: "TODO", // Optional: populate store if needed
        maxQuantity: p.productQuantity,
        productType: p.productType,
      }));
    }),
});
