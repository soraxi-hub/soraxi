import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getProductModel, type IProduct } from "@/lib/db/models/product.model";
import {
  formatProductListResponse,
  RawProductDocumentAdminManagement,
  type RawProductDocument,
} from "@/modules/admin/product-formatter";
import { ProductStatusEnum } from "@/enums";
import { getStoreModel } from "@/lib/db/models/store.model";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  logAdminAction,
} from "@/modules/admin/security/audit-logger";
import { AdminGuard } from "@/domain/admin/admin-guard";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

const ProductStatusWithAll = {
  ...ProductStatusEnum,
  All: "all",
} as const;

export const adminProductRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        status: z.nativeEnum(ProductStatusWithAll).optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { status, category, search, page, limit } = input;
        const Product = await getProductModel();
        await getStoreModel();

        const query: any = {};
        if (status && status !== "all") query.status = status;
        if (category && category !== "all") query.category = category;
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ];
        }

        const products = await Product.find(query)
          .populate({
            path: "storeId",
            select: "name storeEmail",
          })
          .select(
            "name description price category status images createdAt updatedAt",
          )
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean<RawProductDocument[]>();

        const total = await Product.countDocuments(query);

        return formatProductListResponse(products, total, page, limit);
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, { source: "trpc:admin.list" }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't load products. Please try again.",
        );
      }
    }),

  getById: baseProcedure
    .input(
      z.object({
        productId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { productId } = input;
        const Product = await getProductModel();
        await getStoreModel();

        const product = await Product.findById(productId)
          .populate({
            path: "storeId",
            select: "name storeEmail uniqueId status verification",
          })
          .lean<RawProductDocumentAdminManagement>();

        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "No product exists with that ID. It may have been deleted since the list was loaded.",
          });
        }

        return {
          id: product._id.toString(),
          name: product.name,
          description: product.description,
          specifications: product.specifications,
          price: product.price,
          category: product.category,
          status: product.status,
          images: product.images,
          // moderationNotes: product.moderationNotes,
          firstApprovedAt: product.firstApprovedAt,
          store: {
            id: product.storeId._id.toString(),
            name: product.storeId.name,
            email: product.storeId.storeEmail,
            uniqueId: product.storeId.uniqueId,
            status: product.storeId.status,
            verification: product.storeId.verification,
          },
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, { source: "trpc:admin.getById" }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't load that product. Please try again.",
        );
      }
    }),

  action: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        action: z.literal("reject"),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { productId } = input;
        const { admin: unAuthenticatedAdmin } = ctx;

        const admin = AdminGuard.from(unAuthenticatedAdmin).require(
          PERMISSIONS.REJECT_PRODUCT,
        );

        const Product = await getProductModel();
        const product = await Product.findById(productId);

        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "No product exists with that ID. It may have been deleted since the list was loaded.",
          });
        }

        if (product.status === ProductStatusEnum.Rejected) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Product is already rejected",
          });
        }

        const updateData: {
          status: IProduct["status"];
          isVisible: boolean;
          // moderationNotes: string;
        } = {
          status: ProductStatusWithAll.Rejected as IProduct["status"],
          isVisible: false,
          // moderationNotes: reason || "Rejected by admin",
        };
        const message = "Product rejected";
        const auditAction = AUDIT_ACTIONS.PRODUCT_REJECTED;

        await Product.findByIdAndUpdate(productId, updateData);

        // Log admin action
        try {
          const data = {
            adminId: admin.id,
            adminName: admin.name,
            adminEmail: admin.email,
            adminRoles: admin.roles,
            action: auditAction,
            module: AUDIT_MODULES.PRODUCTS,
            resourceId: (product._id as { toString: () => string }).toString(),
            resourceType: "product",
            details: { action: "reject", previousStatus: product.status },
          };

          await logAdminAction(data);
        } catch (error) {
          console.log(
            error || `Failed to Log admin action of susspending a store`,
          );
          if (isReportableError(error)) {
            try {
              await sendTelegramMessage(
                formatErrorReport(error, {
                  source: "trpc:admin.action.logAdminAction",
                }),
              );
            } catch {
              // sendTelegramMessage already console.errors; never mask the original error
            }
          }
        }
        return { success: true, message };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, { source: "trpc:admin.action" }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't complete that action on this product. Please try again.",
        );
      }
    }),
});
