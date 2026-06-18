import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { StoreStatusEnum } from "@/enums";
import { StoreRepository } from "@/repositories/store-repo";
import { StoreFactory } from "@/domain/stores/store-factory";
import { ProductRepository } from "@/repositories/product-repo";
import { Product } from "@/domain/products/product";

export const publicStoreRouter = createTRPCRouter({
  getStoreProfilePublic: baseProcedure
    .input(
      z.object({
        storeId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { storeId } = input;

      // Validate store ID format
      if (!mongoose.Types.ObjectId.isValid(storeId))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid store ID format",
        });

      // 1. Fetch base store (domain entity)
      const storeDoc = await StoreRepository.findStoreById(storeId);

      if (!storeDoc)
        throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });

      const baseStore = StoreFactory.store({
        ...storeDoc,
        storeOwner: storeDoc.storeOwner.toString(),
      });

      if (baseStore.status !== StoreStatusEnum.Active) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store is not available.",
        });
      }

      // 2. Fetch product IDs and then populated products
      const productIds = baseStore.products; // string[]
      const productDocs = await ProductRepository.findByIds(productIds);

      const populatedProducts = productDocs.map((doc) =>
        new Product(doc).toJSON(),
      );

      return { storeDoc, populatedProducts };
    }),
});
