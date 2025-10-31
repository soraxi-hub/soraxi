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
import { ProductTypeEnum } from "@/validators/product-validators";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";

/**
 * @module wishlistRouter
 * @description
 * Handles all wishlist-related operations such as fetching, adding, and removing
 * items from a user's wishlist. Each procedure validates authentication, manages
 * MongoDB interactions safely, and uses centralized error handling for resilience.
 */
export const wishlistRouter = createTRPCRouter({
  /**
   * @procedure getUnPopulatedWishlistByUserId
   * @description
   * Fetches the user's wishlist without populating product details.
   * Primarily used to check if a product already exists in a user's wishlist
   * (for example, inside a product info component).
   */
  getUnPopulatedWishlistByUserId: baseProcedure.query(async ({ ctx }) => {
    try {
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
        return {
          userId: user.id,
          products: [],
          createdAt: null,
          updatedAt: null,
        };
      }

      const formattedWishlist = {
        userId: wishlist.userId.toString(),
        products: wishlist.products.map((p) => ({
          productId: p.productId.toString(),
          productType: p.productType,
        })),
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt,
      };

      return formattedWishlist;
    } catch (err) {
      console.error("Error in getUnPopulatedWishlistByUserId:", err);
      throw handleTRPCError(err, "Failed to fetch wishlist data.");
    }
  }),

  /**
   * @procedure getByUserId
   * @description
   * Retrieves a user's wishlist with full product details populated.
   * Returns a default empty structure if no wishlist exists for the user.
   */
  getByUserId: baseProcedure.query(async ({ ctx }) => {
    try {
      const { user } = ctx;

      if (!user || !user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to access your wishlist.",
        });
      }

      const wishlist = await getWishlistByUserId(user.id);

      // If no wishlist exists, return an empty placeholder structure
      if (!wishlist) {
        return {
          userId: user.id,
          products: [],
          createdAt: null,
          updatedAt: null,
        };
      }

      const formattedWishlist = {
        userId: wishlist.userId.toString(),
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
    } catch (err) {
      console.error("Error in getByUserId:", err);
      throw handleTRPCError(err, "Failed to fetch user wishlist.");
    }
  }),

  /**
   * @procedure addItem
   * @description
   * Adds a product to a user's wishlist. Validates user and product data
   * before persisting the update.
   */
  addItem: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        productType: z.nativeEnum(ProductTypeEnum),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to access your wishlist.",
          });
        }

        const updated = await addItemToWishlist(user.id, {
          productId: new mongoose.Types.ObjectId(input.productId),
          productType: input.productType,
        });

        return updated;
      } catch (err) {
        console.error("Error adding item to wishlist:", err);
        throw handleTRPCError(err, "Failed to add item to wishlist.");
      }
    }),

  /**
   * @procedure removeItem
   * @description
   * Removes a specific product from a user's wishlist.
   * Throws an error if the wishlist or item does not exist.
   */
  removeItem: baseProcedure
    .input(
      z.object({
        productId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
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
            message: "Wishlist or item not found.",
          });
        }

        return updated;
      } catch (err) {
        console.error("Error removing item from wishlist:", err);
        throw handleTRPCError(err, "Failed to remove item from wishlist.");
      }
    }),
});
