import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getProductModel, type IProduct } from "@/lib/db/models/product.model";
import {
  formatProductListResponse,
  RawProductDocumentAdminManagement,
  type RawProductDocument,
} from "@/modules/admin/product-formatter";
import { ProductStatusEnum } from "@/validators/product-validators";
import { getStoreModel } from "@/lib/db/models/store.model";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  logAdminAction,
} from "@/modules/admin/security/audit-logger";

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
      })
    )
    .query(async ({ input }) => {
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
          "name description price category status images createdAt updatedAt"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<RawProductDocument[]>();

      const total = await Product.countDocuments(query);

      return formatProductListResponse(products, total, page, limit);
    }),

  getById: baseProcedure
    .input(
      z.object({
        productId: z.string(),
      })
    )
    .query(async ({ input }) => {
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
          message: "Product not found",
        });
      }

      return {
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        status: product.status,
        images: product.images,
        isVerifiedProduct: product.isVerifiedProduct,
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
    }),

  action: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        action: z.enum(["approve", "reject"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { productId, action } = input;
      const { admin } = ctx;
      const allowedPermissions = [
        PERMISSIONS.VERIFY_PRODUCT,
        PERMISSIONS.REJECT_PRODUCT,
      ];

      if (
        !admin ||
        !allowedPermissions.some((permission) =>
          checkAdminPermission(admin, [permission])
        )
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Admin authentication required",
        });
      }

      const Product = await getProductModel();
      const product = await Product.findById(productId);

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      let updateData: {
        status: IProduct["status"];
        isVerifiedProduct: boolean;
        // moderationNotes: string;
        firstApprovedAt?: Date;
      } = {
        status: ProductStatusWithAll.Pending as IProduct["status"],
        isVerifiedProduct: false,
        // moderationNotes: "",
      };
      let message = "";
      let auditAction = "";

      switch (action) {
        case "approve":
          if (product.status !== "pending") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Product is not pending approval",
            });
          }
          updateData = {
            status: ProductStatusWithAll.Approved as IProduct["status"],
            isVerifiedProduct: true,
            firstApprovedAt: new Date(),
            // moderationNotes: reason || "Approved by admin",
          };
          message = "Product approved successfully";
          auditAction = AUDIT_ACTIONS.PRODUCT_APPROVED;
          break;
        case "reject":
          if (product.status !== "pending") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Product is not pending approval",
            });
          }
          updateData = {
            status: ProductStatusWithAll.Rejected as IProduct["status"],
            isVerifiedProduct: false,
            // moderationNotes: reason || "Rejected by admin",
          };
          message = "Product rejected";
          auditAction = AUDIT_ACTIONS.PRODUCT_REJECTED;
          break;
      }

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
          details: { action, previousStatus: product.status },
        };

        await logAdminAction(data);
      } catch (error) {
        console.log(
          error || `Failed to Log admin action of susspending a store`
        );
      }
      return { success: true, message };
    }),
});
