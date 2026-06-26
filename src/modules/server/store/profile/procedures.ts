import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";
import { storeName, storeDescription } from "@/validators/store-validators";
import { StoreRepository } from "@/repositories/store-repo";
import { StoreFactory } from "@/domain/stores/store-factory";
import { ProductRepository } from "@/repositories/product-repo";
import { Product } from "@/domain/products/product";

export const storeProfileRouter = createTRPCRouter({
  getStoreProfilePrivate: baseProcedure.query(async ({ ctx }) => {
    const { store } = ctx;

    if (!store) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to view this store.",
      });
    }

    // 1. Fetch base store (domain entity)
    const storeDoc = await StoreRepository.findStoreById(store.id);

    if (!storeDoc)
      throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });

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

    return { storeDoc, populatedProducts };
  }),

  handleStoreNameUpdate: baseProcedure
    .input(
      z.object({
        name: storeName,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;

      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update the store name.",
        });
      }

      const Store = await getStoreModel();

      // Check if store name is already taken by another store
      const existingStore = await Store.findOne({
        name: input.name,
        _id: { $ne: store.id },
      }).collation({ locale: "en", strength: 2 });

      if (existingStore) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "A store with this name already exists. Please choose a different name.",
        });
      }

      let updatedStore = null;
      try {
        updatedStore = await Store.findByIdAndUpdate(
          store.id,
          { name: input.name },
          { new: true, runValidators: true },
        )
          .select(
            "-password -storeOwner -recipientCode -walletId -suspensionReason -shippingMethods -payoutAccounts -updatedAt -forgotpasswordToken -forgotpasswordTokenExpiry",
          )
          .lean();
      } catch (err: unknown) {
        // Handle unique index violation if present
        if ((err as any)?.code === 11000) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "A store with this name already exists. Please choose a different name.",
          });
        }
        throw err;
      }
      if (!updatedStore) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found.",
        });
      }

      return {
        success: true,
        message: "Store name updated successfully.",
      };
    }),

  handleStoreDescriptionUpdate: baseProcedure
    .input(
      z.object({
        description: storeDescription,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;

      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update the store description.",
        });
      }

      const Store = await getStoreModel();
      const updatedStore = await Store.findByIdAndUpdate(
        store.id,
        { description: input.description },
        { new: true, runValidators: true },
      )
        .select(
          "-password -storeOwner -recipientCode -walletId -suspensionReason -shippingMethods -payoutAccounts -updatedAt -forgotpasswordToken -forgotpasswordTokenExpiry",
        )
        .lean();

      if (!updatedStore) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found.",
        });
      }

      return {
        success: true,
        message: "Store description updated successfully.",
      };
    }),
});
