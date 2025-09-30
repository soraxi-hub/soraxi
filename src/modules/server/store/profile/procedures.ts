import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";
import type mongoose from "mongoose";
import { getProductModel, type IProduct } from "@/lib/db/models/product.model";
import { koboToNaira } from "@/lib/utils/naira";
import {
  storeName as StoreNameSchema,
  storeDescription as StoreDescriptionSchema,
} from "@/validators/store-validators";

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

export const storeProfileRouter = createTRPCRouter({
  // Fetch Store Profile Data. This is used for private store profiles.
  getStoreProfilePrivate: baseProcedure.query(async ({ ctx }) => {
    const { store } = ctx;

    if (!store) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to view this store.",
      });
    }

    const Store = await getStoreModel();
    await getProductModel();
    const storeData = await Store.findById(store.id)
      .select(
        "-password -storeOwner -recipientCode -walletId -suspensionReason -shippingMethods -payoutAccounts -updatedAt -forgotpasswordToken -forgotpasswordTokenExpiry"
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
      followers: storeData.followers.map((follower: mongoose.Types.ObjectId) =>
        follower.toString()
      ),
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

  handleStoreNameUpdate: baseProcedure
    .input(
      z.object({
        name: StoreNameSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;

      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update the store name.",
        });
      }

      const Store = await getStoreModel();

      // Check if store name is already taken by another store
      const existingStore = await Store.findOne({
        name: input.name,
        _id: { $ne: store.id },
      }).collation({ locale: "en", strength: 2 });

      if (existingStore) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A store with this name already exists. Please choose a different name.",
        });
      }

      let updatedStore = null;
      try {
        updatedStore = await Store.findByIdAndUpdate(
          store.id,
          { name: input.name },
          { new: true, runValidators: true }
        )
          .select(
            "-password -storeOwner -recipientCode -walletId -digitalProducts -suspensionReason -shippingMethods -payoutAccounts -updatedAt -forgotpasswordToken -forgotpasswordTokenExpiry"
          )
          .lean();
      } catch (err: unknown) {
        // Handle unique index violation if present
        if ((err as any)?.code === 11000) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "A store with this name already exists. Please choose a different name.",
          });
        }
        throw err;
      }
      if (!updatedStore) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found.",
        });
      }

      return {
        success: true,
        message: "Store name updated successfully.",
      };
    }),

  handleStoreDescriptionUpdate: baseProcedure
    .input(
      z.object({
        description: StoreDescriptionSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;

      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update the store description.",
        });
      }

      const Store = await getStoreModel();
      const updatedStore = await Store.findByIdAndUpdate(
        store.id,
        { description: input.description },
        { new: true, runValidators: true }
      )
        .select(
          "-password -storeOwner -recipientCode -walletId -digitalProducts -suspensionReason -shippingMethods -payoutAccounts -updatedAt -forgotpasswordToken -forgotpasswordTokenExpiry"
        )
        .lean();

      if (!updatedStore) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found.",
        });
      }

      return {
        success: true,
        message: "Store description updated successfully.",
      };
    }),
});
