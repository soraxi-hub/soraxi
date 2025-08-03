import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { getProductModel } from "@/lib/db/models/product.model";

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
          (store.businessInfo.type === "individual" ||
            (store.businessInfo.type === "company" &&
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

      const query: Record<string, any> = { storeID: store.id };

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

      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store authentication required",
        });
      }

      const Product = await getProductModel();
      const product = await Product.findById(input.productId).select(
        "storeID isVisible slug"
      );

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      if (product.storeID.toString() !== store.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Unauthorized access to product",
        });
      }
      // console.log("product", product);

      product.isVisible = input.isVisible;
      await product.save();

      return {
        success: true,
        message: `Product ${input.isVisible ? "shown" : "hidden"} successfully`,
        product: {
          id: (product._id as unknown as mongoose.Types.ObjectId).toString(),
          isVisible: product.isVisible,
        },
      };
    }),
});

export const computeOnboardingStatus = (store: IStore) => {
  const onboardingStatus = {
    profileComplete: !!(store.name && store.description),
    businessInfoComplete: !!(
      store.businessInfo &&
      (store.businessInfo.type === "individual" ||
        (store.businessInfo.type === "company" &&
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
