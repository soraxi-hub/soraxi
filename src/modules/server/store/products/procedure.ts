import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import mongoose from "mongoose";
import { ProductFactory } from "@/domain/products/product-factory";

export const storeProductRouter = createTRPCRouter({
  /**
   * This method is used by the edit product page to fetch store product for editing.
   */
  getStoreProductById: baseProcedure
    .input(
      z.object({
        productId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { store } = ctx;
      const { productId } = input;

      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store authentication required",
        });
      }

      const ProductModel = await getProductModel();

      const productDoc = await QueryBuilderFactory.queryBuilder<IProduct>(
        ProductModel,
      )
        .where("_id", new mongoose.Types.ObjectId(productId))
        .executeOne();

      if (!productDoc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      const product = ProductFactory.create({
        ...productDoc,
        _id: productDoc._id?.toString(),
        storeId: productDoc.storeId.toString(),
      }).toEditableProuct();

      if (product.storeId.toString() !== store.id) {
        // Ensure comparison is string to string
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access to product",
        });
      }

      return {
        success: true,
        product,
      };
    }),
});
