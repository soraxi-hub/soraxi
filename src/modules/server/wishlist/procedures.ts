import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import {
  getWishlistByUserId,
  addItemToWishlist,
  removeItemFromWishlist,
} from "@/lib/db/models/wishlist.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";

export const wishlistRouter = createTRPCRouter({
  // ✅ Get wishlist by user ID
  getByUserId: baseProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const wishlist = await getWishlistByUserId(input.userId, true); // lean = true for plain JS object
      if (!wishlist) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Wishlist for user ${input.userId} not found.`,
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
      console.log("productType", input.productType);
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
        userId: z.string(),
        productId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const updated = await removeItemFromWishlist(
        input.userId,
        input.productId
      );
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wishlist or item not found",
        });
      }
      return updated;
    }),
});
