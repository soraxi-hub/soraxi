import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getStoreModel } from "@/lib/db/models/store.model";
import mongoose from "mongoose";
import { Product } from "@/types";
import { koboToNaira } from "@/lib/utils/naira";

export const adminStoreRouter = createTRPCRouter({
  getStoreProfileAdminView: baseProcedure
    .input(
      z.object({
        storeId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { storeId } = input;

      if (!storeId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view this store.",
        });
      }

      // Validate user ID format
      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid store ID format",
        });
      }

      const Store = await getStoreModel();
      const storeData = await Store.findById(storeId)
        .select(
          "-password -storeOwner -recipientCode -wallet -suspensionReason -payoutHistory -platformFee -shippingMethods -payoutAccounts -transactionFees -updatedAt -forgotpasswordToken -forgotpasswordTokenExpiry"
        )
        .populate({
          path: "physicalProducts",
          model: "Product",
          match: { isVerifiedProduct: true },
          select:
            "_id name images price sizes slug isVerifiedProduct category productType",
        })
        .lean();

      if (!storeData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found.",
        });
      }

      const formattedStoreData = {
        _id: storeData._id.toString(),
        name: storeData.name,
        storeEmail: storeData.storeEmail,
        uniqueId: storeData.uniqueId,
        followers: storeData.followers.map(
          (follower: mongoose.Types.ObjectId) => follower.toString()
        ),
        products: (
          (storeData.physicalProducts as unknown as Product[]) || []
        ).map((product) => ({
          _id: product._id.toString(),
          name: product.name,
          images: product.images,
          price: koboToNaira(product.price || 0),
          sizes: product.sizes,
          slug: product.slug,
          category: product.category,
          isVerifiedProduct: product.isVerifiedProduct,
          productType: product.productType,
        })),
        logoUrl: storeData.logoUrl,
        bannerUrl: storeData.bannerUrl,
        description: storeData.description,
        verification: storeData.verification,
        businessInfo: storeData.businessInfo,
        ratings: storeData.ratings,
        status: storeData.status,
        agreedToTermsAt: storeData.agreedToTermsAt,
        createdAt: storeData.createdAt,
      };

      return formattedStoreData;
    }),
});
