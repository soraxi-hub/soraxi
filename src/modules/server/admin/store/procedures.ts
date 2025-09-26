import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import {
  getStoreModel,
  type IStore,
  StoreStatus,
} from "@/lib/db/models/store.model";
import mongoose from "mongoose";
import type { Product } from "@/types";
import { koboToNaira } from "@/lib/utils/naira";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import { getProductModel } from "@/lib/db/models/product.model";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  logAdminAction,
} from "@/modules/admin/security/audit-logger";
import { sendMail } from "@/services/mail.service";

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
          createdAt: store.createdAt,
          lastActivity: store.updatedAt,
        }));

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
    .query(async ({ input, ctx }) => {
      const { storeId } = input;
      const { admin } = ctx;

      /**
       * Admin Authentication Check
       *
       * Verifies that the request is coming from an authenticated admin user
       * with appropriate permissions.
       */
      if (!admin || !checkAdminPermission(admin, [])) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Admin authentication required",
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
      await getProductModel();
      const storeData = await Store.findById(storeId)
        .select(
          "-password -storeOwner -recipientCode -walletId -suspensionReason -forgotpasswordToken -forgotpasswordTokenExpiry"
        )
        .populate({
          path: "physicalProducts",
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
        updatedAt: storeData.updatedAt,
        payoutAccounts: storeData.payoutAccounts,
        shippingMethods: storeData.shippingMethods,
      };

      return formattedStoreData;
    }),

  storeActionForAdmins: baseProcedure
    .input(
      z.object({
        storeId: z.string(),
        action: z.enum(["reactivate", "approved", "rejected", "suspend"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { storeId, action } = input;
        const { admin } = ctx;

        /**
         * Admin Authentication Check
         *
         * Verifies that the request is coming from an authenticated admin user
         * with appropriate permissions.
         */
        if (!admin || !checkAdminPermission(admin, [])) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin authentication required",
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
        const store = await Store.findById(storeId).select(
          "storeEmail verification status"
        );

        if (!store) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found.",
          });
        }

        let updateData = {};
        let auditAction = "";
        let message = "";

        switch (action) {
          case "approved":
            if (
              store.status !== (StoreStatus.Pending || StoreStatus.Rejected)
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Store Status is not: ${StoreStatus.Pending} or ${StoreStatus.Rejected} `,
              });
            }
            updateData = {
              status: StoreStatus.Active,
              "verification.isVerified": true,
              "verification.verifiedAt": new Date(),
              "verification.notes": `Approved by admin (${admin.name})`,
            };
            auditAction = AUDIT_ACTIONS.STORE_APPROVED;
            message = `Store approved successfully. Approved by: (${admin.name})`;
            break;

          case StoreStatus.Rejected:
            if (store.status !== StoreStatus.Pending) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Store is not pending approval",
              });
            }
            updateData = {
              status: StoreStatus.Rejected,
              "verification.isVerified": false,
              "verification.notes": `Rejected by admin (${admin.name})`,
            };
            auditAction = AUDIT_ACTIONS.STORE_REJECTED;
            message = "Store rejected";
            break;

          case "suspend":
            if (store.status !== StoreStatus.Active) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Store is not ${StoreStatus.Active}`,
              });
            }
            updateData = {
              status: "suspended",
              "verification.notes": `Store Suspended by admin (${admin.name})`,
            };
            auditAction = AUDIT_ACTIONS.STORE_SUSPENDED;
            message = "Store suspended";
            break;

          case "reactivate":
            if (store.status !== StoreStatus.Suspended) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Store is not ${StoreStatus.Suspended}`,
              });
            }
            updateData = {
              status: StoreStatus.Active,
              "verification.notes": `Store Reactivated by admin (${admin.name})`,
            };
            auditAction = AUDIT_ACTIONS.STORE_REACTIVATED;
            message = `Store Reactivated by admin (${admin.name})`;
            break;

          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid action",
            });
        }

        // Update store
        await Store.findByIdAndUpdate(storeId, updateData);

        // Log admin action
        const data = {
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles,
          action: auditAction,
          module: AUDIT_MODULES.STORES,
          resourceId: storeId,
          resourceType: "store",
          details: { action, previousStatus: store.status },
        };

        await logAdminAction(data);

        // Send notification email to store owner
        const storeEmail = store.storeEmail;
        let subject = "";
        let html = "";

        // Choose email subject and body based on the action
        switch (action) {
          case "approved":
            subject = "🎉 Your store has been approved!";
            html = `
      <p>Hello,</p>
      <p>We’re excited to let you know that your store has been approved by our admin team and is now active on SoraxiHub.</p>
      <p>You can now start listing products and receiving orders.</p>
      <p><strong>Status:</strong> Active</p>
      <p>– The SoraxiHub Team</p>
    `;
            break;

          case "rejected":
            subject = "⚠️ Your store application was rejected";
            html = `
      <p>Hello,</p>
      <p>Unfortunately, your store application was not approved at this time.</p>
      <p><strong>Status:</strong> Rejected</p>
      <p>If you believe this was in error or would like to reapply, please contact support.</p>
      <p>– The SoraxiHub Team</p>
    `;
            break;

          case "suspend":
            subject = "⏸️ Your store has been suspended";
            html = `
      <p>Hello,</p>
      <p>Your store has been suspended by our admin team. You will not be able to receive orders until further notice.</p>
      <p><strong>Status:</strong> Suspended</p>
      <p>Please contact support if you’d like more information.</p>
      <p>– The SoraxiHub Team</p>
    `;
            break;

          case "reactivate":
            subject = "✅ Your store has been reactivated";
            html = `
      <p>Hello,</p>
      <p>Good news! Your store has been reactivated and is now live again on SoraxiHub.</p>
      <p><strong>Status:</strong> Active</p>
      <p>– The SoraxiHub Team</p>
    `;
            break;
        }

        if (storeEmail) {
          await sendMail({
            email: storeEmail,
            emailType: "noreply",
            fromAddress: "noreply@soraxihub.com",
            subject,
            html,
          });
        }

        return {
          status: 200,
          message,
        };
      } catch (error) {
        console.error("storeActionForAdmins error:", error);

        if (error instanceof TRPCError) {
          // Already a TRPCError, just rethrow
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong while performing the store action",
          cause: error, // optional, lets you inspect the raw error in dev
        });
      }
    }),
});
