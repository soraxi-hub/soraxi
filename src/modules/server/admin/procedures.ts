import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
import {
  formatProductListResponse,
  RawProductDocument,
} from "@/modules/admin/product-formatter";

export const adminRouter = createTRPCRouter({
  list: baseProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const { status, category, search, page, limit } = input;
      const Product = await getProductModel();

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
        .populate("storeID", "name storeEmail")
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

  action: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        action: z.enum(["approve", "reject", "delete"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { productId, action, reason } = input;
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
        moderationNotes: string;
      } = {
        status: "pending",
        isVerifiedProduct: false,
        moderationNotes: "",
      };
      let message = "";

      switch (action) {
        case "approve":
          if (product.status !== "pending") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Product is not pending approval",
            });
          }
          updateData = {
            status: "approved",
            isVerifiedProduct: true,
            moderationNotes: reason || "Approved by admin",
          };
          message = "Product approved successfully";
          break;
        case "reject":
          if (product.status !== "pending") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Product is not pending approval",
            });
          }
          updateData = {
            status: "rejected",
            isVerifiedProduct: false,
            moderationNotes: reason || "Rejected by admin",
          };
          message = "Product rejected";
          break;
        case "delete":
          await Product.findByIdAndDelete(productId);
          message = "Product deleted";
          return { success: true, message };
      }

      await Product.findByIdAndUpdate(productId, updateData);
      return { success: true, message };
    }),
});
