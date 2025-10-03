import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { getProductModel } from "@/lib/db/models/product.model";
import {
  StoreBusinessInfoEnum,
  StoreStatusEnum,
} from "@/validators/store-validators";
import { ProductStatusEnum } from "@/validators/product-validators";

export const storeRouter = createTRPCRouter({
  getById: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;
      const Store = await getStoreModel();

      const store = (await Store.findById(id).select(
        "name storeEmail status verification businessInfo shippingMethods payoutAccounts agreedToTermsAt description logoUrl bannerUrl"
      )) as (IStore & { _id: string }) | null;

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Store with id ${id} not found.`,
          cause: "StoreNotFound",
        });
      }

      return {
        id: store._id.toString(),
        name: store.name,
        storeEmail: store.storeEmail,
        status: store.status,
        verification: store.verification,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        onboarding: computeOnboardingStatus(store),
      };
    }),

  getOnboardingDetails: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;

      if (!id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store is not authenticated",
        });
      }

      const Store = await getStoreModel();
      const store = (await Store.findById(id).lean()) as IStore | null;

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      // Determine progress
      const progressSteps = {
        profile: !!(store.name && store.description),
        "business-info": !!(
          store.businessInfo &&
          (store.businessInfo.type === StoreBusinessInfoEnum.Individual ||
            (store.businessInfo.type === StoreBusinessInfoEnum.Company &&
              store.businessInfo.businessName &&
              store.businessInfo.registrationNumber))
        ),
        shipping: !!(store.shippingMethods?.length > 0),
        payout: !!(store.payoutAccounts?.length > 0),
        terms: !!store.agreedToTermsAt,
      };

      const completedSteps = Object.entries(progressSteps)
        .filter(([_, complete]) => complete)
        .map(([key]) => key);

      const totalSteps = Object.keys(progressSteps).length;
      const currentStep = completedSteps.length;
      const percentage = Math.round((completedSteps.length / totalSteps) * 100);

      return {
        storeId: (store._id as unknown as mongoose.Types.ObjectId).toString(),
        data: {
          profile: {
            name: store.name,
            description: store.description,
            logoUrl: store.logoUrl,
            bannerUrl: store.bannerUrl,
          },
          "business-info": store.businessInfo || {},
          shipping: store.shippingMethods,
          payout: store.payoutAccounts,
          terms: store.agreedToTermsAt,
        },
        progress: {
          currentStep,
          completedSteps,
          totalSteps,
          percentage,
        },
      };
    }),

  getStoreProducts: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        visible: z.enum(["true", "false"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;

      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store authentication required",
        });
      }

      const { page, limit, status, visible } = input;

      const Product = await getProductModel();

      const query: Record<string, any> = { storeId: store.id };

      if (status === "pending") {
        // query.isVerifiedProduct = false;
        query.status = "pending";
      } else if (status === "approved") {
        query.status = "approved";
        // query.isVerifiedProduct = true;
      } else if (status === "rejected") {
        query.status = "rejected";
      }

      if (visible === "true") {
        query.isVisible = true;
      } else if (visible === "false") {
        query.isVisible = false;
      }

      const products = await Product.find(query)
        .select(
          "name price sizes productQuantity images category subCategory isVerifiedProduct isVisible status createdAt slug rating"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Product.countDocuments(query);

      const transformedProducts = products.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        price: product.price,
        sizes: product.sizes,
        productQuantity: product.productQuantity,
        images: product.images,
        category: product.category,
        subCategory: product.subCategory,
        status: product.status,
        createdAt: product.createdAt,
        slug: product.slug,
        isVerifiedProduct: product.isVerifiedProduct,
        isVisible: product.isVisible,
        rating: product.rating,
      }));

      return {
        success: true,
        products: transformedProducts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }),

  handleVisibilityToggle: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        isVisible: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;

      try {
        if (!store) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store authentication required",
          });
        }

        const Store = await getStoreModel();
        const storeDoc = await Store.findById(store.id).select("status");

        if (!storeDoc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found",
          });
        }

        // Prevent product visibility updates depending on store status
        switch (storeDoc.status) {
          case StoreStatusEnum.Pending:
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Your store is still pending approval. You cannot update product visibility until it is approved.",
            });

          case StoreStatusEnum.Rejected:
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Your store application was rejected. Please contact support for further details.",
            });

          case StoreStatusEnum.Suspended:
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Your store is currently suspended. You cannot update product visibility at this time.",
            });

          case StoreStatusEnum.Active:
            // ✅ Approved stores are allowed to update product visibility
            break;

          default:
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Invalid store status. Please contact support.",
            });
        }

        const Product = await getProductModel();
        const product = await Product.findById(input.productId).select(
          "storeId isVisible isVerifiedProduct slug"
        );

        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product not found",
          });
        }

        if (product.storeId.toString() !== store.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Unauthorized access to product",
          });
        }

        // If the product is not verified, prevent making it visible
        if (!product.isVerifiedProduct && input.isVisible) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "This product cannot be made visible because it has not been verified yet.",
          });
        }
        // Only approved products may be visible
        if (input.isVisible && product.status !== ProductStatusEnum.Approved) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only approved products can be made visible.",
          });
        }
        // Idempotency: avoid unnecessary write
        if (product.isVisible === input.isVisible) {
          return {
            success: true,
            message: `Product already ${input.isVisible ? "shown" : "hidden"}`,
            product: {
              id: (
                product._id as unknown as mongoose.Types.ObjectId
              ).toString(),
              isVisible: product.isVisible,
            },
          };
        }

        // console.log("product", product);
        product.isVisible = input.isVisible;
        await product.save();

        // console.log("product", product);
        product.isVisible = input.isVisible;
        await product.save();

        return {
          success: true,
          message: `Product ${
            input.isVisible ? "shown" : "hidden"
          } successfully`,
          product: {
            id: (product._id as unknown as mongoose.Types.ObjectId).toString(),
            isVisible: product.isVisible,
          },
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "An unexpected error occurred",
          cause: error,
        });
      }
    }),
});

export const computeOnboardingStatus = (store: IStore) => {
  const onboardingStatus = {
    profileComplete: !!(store.name && store.description),
    businessInfoComplete: !!(
      store.businessInfo &&
      (store.businessInfo.type === StoreBusinessInfoEnum.Individual ||
        (store.businessInfo.type === StoreBusinessInfoEnum.Company &&
          store.businessInfo.businessName &&
          store.businessInfo.registrationNumber))
    ),
    shippingComplete: !!(
      store.shippingMethods && store.shippingMethods.length > 0
    ),
    // payoutComplete: !!(store.payoutAccounts && store.payoutAccounts.length > 0),
    termsComplete: !!store.agreedToTermsAt,
  };

  const completedSteps = Object.values(onboardingStatus).filter(Boolean).length;
  const totalSteps = Object.keys(onboardingStatus).length;

  return {
    ...onboardingStatus,
    completedSteps,
    totalSteps,
    isComplete: completedSteps === totalSteps,
    percentage: Math.round((completedSteps / totalSteps) * 100),
  };
};
