import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import mongoose from "mongoose";
import { Product } from "@/types";
import { koboToNaira } from "@/lib/utils/naira";
import { checkAdminPermission } from "@/modules/admin/security/access-control";

export const adminStoreRouter = createTRPCRouter({
  listStores: baseProcedure
    .input(
      z.object({
        status: z
          .enum(["active", "suspended", "pending", "rejected", "all"])
          .optional(),
        verified: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Add admin authentication check here
        if (!ctx.admin || !checkAdminPermission(ctx.admin, ["view_stores"])) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
          });
        }

        const { status, verified, search, page, limit } = input;

        const Store = await getStoreModel();

        // Build query
        const query: { [key: string]: any } = {};

        if (status && status !== "all") {
          query.status = status;
        }

        if (verified && verified !== "all") {
          query["verification.isVerified"] = verified === "true";
        }

        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { storeEmail: { $regex: search, $options: "i" } },
          ];
        }

        // Get stores with pagination
        const stores = await Store.find(query)
          .select(
            "name storeEmail status verification businessInfo createdAt updatedAt"
          )
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

        // Get total count for pagination
        const total = await Store.countDocuments(query);

        // Transform data for frontend
        const transformedStores = stores.map((store: IStore) => ({
          id: (store._id as unknown as mongoose.Types.ObjectId).toString(),
          name: store.name,
          storeEmail: store.storeEmail,
          status: store.status,
          verification: store.verification,
          businessInfo: store.businessInfo,
          stats: {
            totalProducts: 0, // TODO: Calculate from products collection
            totalOrders: 0, // TODO: Calculate from orders collection
            totalRevenue: 0, // TODO: Calculate from orders collection
            averageRating: 0, // TODO: Calculate from reviews collection
          },
          createdAt: store.createdAt,
          lastActivity: store.updatedAt,
        }));

        // Log admin action
        // await logAdminAction({
        //   adminId: ctx.admin.id,
        //   adminName: ctx.admin.name,
        //   adminEmail: ctx.admin.email,
        //   adminRoles: ctx.admin.roles,
        //   action: "Viewed stores list",
        //   module: AUDIT_MODULES.STORES,
        //   details: { filters: { status, verified, search }, page, limit },
        //   ipAddress: ctx.req.headers.get("x-forwarded-for") || "unknown",
        //   userAgent: ctx.req.headers.get("user-agent") || "unknown",
        // });

        return {
          success: true,
          stores: transformedStores,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      } catch (error) {
        console.error("Error fetching stores:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch stores",
        });
      }
    }),

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
