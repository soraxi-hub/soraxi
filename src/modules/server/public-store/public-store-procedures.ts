import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { getProductModel, type IProduct } from "@/lib/db/models/product.model";
import { koboToNaira } from "@/lib/utils/naira";
import { getStoreModel } from "@/lib/db/models/store.model";
import { StoreStatusEnum } from "@/validators/store-validators";

type Product = Pick<
  IProduct,
  | "name"
  | "images"
  | "price"
  | "sizes"
  | "slug"
  | "isVerifiedProduct"
  | "productType"
  | "category"
> & { _id: mongoose.Types.ObjectId };

export const publicStoreRouter = createTRPCRouter({
  getStoreProfilePublic: baseProcedure
    .input(
      z.object({
        storeId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { storeId } = input;

      // Validate store ID format
      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid store ID format",
        });
      }

      const Store = await getStoreModel();
      await getProductModel();

      const storeData = await Store.findById(storeId)
        .select(
          "name uniqueId description logoUrl bannerUrl verification businessInfo ratings status followers physicalProducts createdAt"
        )
        .populate({
          path: "physicalProducts",
          model: "Product",
          match: { isVerifiedProduct: true }, // Only show verified products to public
          select: "_id name images price sizes slug category productType",
        })
        .lean();

      if (!storeData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found.",
        });
      }

      if (storeData.status !== StoreStatusEnum.Active) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store is not available.",
        });
      }

      const formattedStoreData = {
        _id: storeData._id.toString(),
        name: storeData.name,
        uniqueId: storeData.uniqueId,
        description: storeData.description,
        logoUrl: storeData.logoUrl,
        bannerUrl: storeData.bannerUrl,
        verification: {
          isVerified: storeData.verification?.isVerified || false,
          verifiedAt: storeData.verification?.verifiedAt,
        },
        businessInfo: {
          businessName: storeData.businessInfo?.businessName,
          type: storeData.businessInfo?.type,
        },
        ratings: {
          averageRating: storeData.ratings?.averageRating || 0,
          reviewCount: storeData.ratings?.reviewCount || 0,
        },
        stats: {
          followersCount: storeData.followers?.length || 0,
          productsCount:
            (storeData.physicalProducts as unknown as Product[])?.length || 0,
          establishedDate: new Date(storeData.createdAt).getFullYear(),
        },
        products: (
          (storeData.physicalProducts as unknown as Product[]) || []
        ).map((product: Product) => ({
          _id: product._id.toString(),
          name: product.name,
          images: product.images,
          price: koboToNaira(product.price || 0),
          sizes: product.sizes,
          slug: product.slug,
          category: product.category,
          productType: product.productType,
        })),
        createdAt: storeData.createdAt,
      };

      return formattedStoreData;
    }),
});
