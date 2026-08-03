import { z } from "zod";
import { unstable_cache } from "next/cache";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { StoreRepository } from "@/repositories/store-repo";
import { StoreFactory } from "@/domain/stores/store-factory";
import { ProductRepository } from "@/repositories/product-repo";
import { OrderRepository } from "@/repositories/order.repository";
import { Product } from "@/domain/products/product";
import { StoreProfileManagerPublic } from "@/domain/stores/store-profile-manager-public";
import {
  resolveStoreViewState,
  stateExposesProducts,
} from "@/modules/public-store/store-view-state";
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
 *
 * What leaves this function is a deliberately narrow projection
 * (`StorefrontStoreView`), never the store document — that document holds the
 * password hash, contact email, payout bank details and OTP throttle state.
 *
 * Products are attached only for states allowed to expose a catalogue. A
 * pending or suspended store's products are not fetched at all, so they cannot
 * be read out of the response payload.
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

    // 2. Only trading stores get their catalogue read. Status alone decides
    //    this; the product count then separates `active` from `empty`.
    const catalogueIsPublic = stateExposesProducts(
      resolveStoreViewState(baseStore.status, 1),
    );

    const [productDocs, ordersFulfilled] = await Promise.all([
      catalogueIsPublic
        ? ProductRepository.findByIds(baseStore.products)
        : Promise.resolve([]),
      OrderRepository.countFulfilledOrdersForStore(storeId),
    ]);

    const products = productDocs.map((doc) => new Product(doc).toJSON());

    const viewState = resolveStoreViewState(baseStore.status, products.length);

    const store = new StoreProfileManagerPublic(
      baseStore,
      products,
      ordersFulfilled,
    ).toStorefrontJSON();

    const result = { store, products, viewState };
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
