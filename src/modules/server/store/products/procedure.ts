import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import mongoose from "mongoose";
import { ProductFactory } from "@/domain/products/product-factory";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

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
      try {
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
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:store.products.getStoreProductById",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(error, "Failed to fetch store product.");
      }
    }),
});
