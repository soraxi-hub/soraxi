import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { IProduct } from "@/lib/db/models/product.model";
import { koboToNaira } from "@/lib/utils/naira";

type Product = Pick<
  IProduct,
  | "name"
  | "images"
  | "price"
  | "sizes"
  | "slug"
  | "isVerifiedProduct"
  | "formattedPrice"
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
    const storeData = await Store.findById(store.id)
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

  handleStoreDescriptionUpdate: baseProcedure
    .input(z.object({ description: z.string().max(1500) }))
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
          "-password -storeOwner -recipientCode -wallet -digitalProducts -suspensionReason -payoutHistory -platformFee -shippingMethods -payoutAccounts -transactionFees -updatedAt -forgotpasswordToken -forgotpasswordTokenExpiry"
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
