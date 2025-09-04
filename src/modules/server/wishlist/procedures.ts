import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import {
  getWishlistByUserId,
  addItemToWishlist,
  removeItemFromWishlist,
  getWishlistModel,
} from "@/lib/db/models/wishlist.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { IProduct } from "@/lib/db/models/product.model";

export const wishlistRouter = createTRPCRouter({
  // it is used to help check if current product is already in user's wishlist under the product info component
  // This query returns a wishlist object with user ID and product IDs
  getUnPopulatedWishlistByUserId: baseProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    if (!user || !user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access your wishlist.",
      });
    }
    const Wishlist = await getWishlistModel();
    const wishlist = await Wishlist.findOne({ user: user.id }).lean();
    if (!wishlist) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Wishlist for user ${user.id} not found.`,
      });
    }

    const formattedWishlist = {
      user: wishlist.user.toString(),
      products: wishlist.products.map((p) => ({
        productId: p.productId.toString(),
        productType: p.productType,
      })),
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    };

    return formattedWishlist;
  }),

  getByUserId: baseProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    if (!user || !user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access your wishlist.",
      });
    }

    const wishlist = await getWishlistByUserId(user.id);

    // If no wishlist exists, return a default empty structure
    if (!wishlist) {
      return {
        user: user.id,
        products: [],
        createdAt: null,
        updatedAt: null,
      };
    }

    const formattedWishlist = {
      user: wishlist.user.toString(),
      products: wishlist.products.map((p) => {
        const product = p.productId as unknown as IProduct;

        return {
          productId: {
            id: (product._id as mongoose.Types.ObjectId).toString(),
            slug: product.slug,
            name: product.name,
            price: product.price,
            sizes: product.sizes,
            images: product.images,
            category: product.category,
            rating: product.rating,
            productType: product.productType,
          },
          productType: p.productType,
        };
      }),
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    };

    return formattedWishlist;
  }),

  // ✅ Add item to wishlist
  addItem: baseProcedure
    .input(
      z.object({
        userId: z.string(),
        productId: z.string(),
        productType: z.enum(["Product", "digitalproducts"]),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await addItemToWishlist(input.userId, {
        productId: new mongoose.Types.ObjectId(input.productId),
        productType: input.productType,
      });
      return updated;
    }),

  // ✅ Remove item from wishlist
  removeItem: baseProcedure
    .input(
      z.object({
        productId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { user } = ctx;
      if (!user || !user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to access your wishlist.",
        });
      }
      const updated = await removeItemFromWishlist(user.id, input.productId);
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wishlist or item not found",
        });
      }
      return updated;
    }),
});
