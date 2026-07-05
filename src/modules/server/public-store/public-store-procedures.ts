import { z } from "zod";
import { unstable_cache } from "next/cache";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { StoreRepository } from "@/repositories/store-repo";
import { StoreFactory } from "@/domain/stores/store-factory";
import { ProductRepository } from "@/repositories/product-repo";
import { Product } from "@/domain/products/product";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * Public storefront profile is read on every visit to a store page and
 * changes infrequently, so it's cached with a short revalidate window.
 * The result is JSON round-tripped so cache-hit and cache-miss responses
 * have an identical shape (guards against Mongoose ObjectId/Date fields
 * serializing differently once they pass through Next's cache).
 */
const getCachedStoreProfilePublic = unstable_cache(
  async (storeId: string) => {
    // 1. Fetch base store (domain entity)
    const storeDoc = await StoreRepository.findStoreById(storeId);

    if (!storeDoc) {
      return null;
    }

    const baseStore = StoreFactory.store({
      ...storeDoc,
      storeOwner: storeDoc.storeOwner.toString(),
    });

    // 2. Fetch product IDs and then populated products
    const productIds = baseStore.products; // string[]
    const productDocs = await ProductRepository.findByIds(productIds);

    const populatedProducts = productDocs.map((doc) =>
      new Product(doc).toJSON(),
    );

    const result = { storeDoc, populatedProducts };
    return JSON.parse(JSON.stringify(result)) as typeof result;
  },
  ["public-store:getStoreProfilePublic"],
  { revalidate: 60 },
);

export const publicStoreRouter = createTRPCRouter({
  getStoreProfilePublic: baseProcedure
    .input(
      z.object({
        storeId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { storeId } = input;

        // Validate store ID format
        if (!mongoose.Types.ObjectId.isValid(storeId))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid store ID format",
          });

        const result = await getCachedStoreProfilePublic(storeId);

        if (!result)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found",
          });

        return result;
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:public-store.getStoreProfilePublic",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(error, "Error in getStoreProfilePublic procedure.");
      }
    }),
});
