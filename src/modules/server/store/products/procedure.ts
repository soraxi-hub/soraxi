import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
// The moved visibility toggle reads the store's status before allowing a
// product to be published, so this router now needs the store model too.
import { getStoreModel } from "@/lib/db/models/store.model";
import { ProductStatusEnum, StoreStatusEnum } from "@/enums";
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
            message:
              "We couldn't find that product. It may have been deleted — refresh your product list.",
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
            message:
              "This product belongs to a different store, so it cannot be changed from here.",
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
        throw handleTRPCError(
          error,
          "We couldn't load that product. Please try again.",
        );
      }
    }),

  /**
   * ---------------------------------------------------------------------------
   * Moved here from store/procedures.ts.
   *
   * These three are product operations that happened to live on the store
   * router. Keeping them there meant the store router grew to 423 lines and
   * mixed two concerns, and it made the product surface hard to find — which is
   * exactly how a second, weaker visibility toggle nearly got written.
   * ---------------------------------------------------------------------------
   */
  getStoreProducts: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        visible: z.enum(["true", "false"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;

      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store authentication required",
        });
      }

      const { page, limit, status, visible } = input;

      const Product = await getProductModel();

      const query: Record<string, any> = { storeId: store.id };

      if (status === "pending") {
        // query.isVerifiedProduct = false;
        query.status = "pending";
      } else if (status === "approved") {
        query.status = "approved";
        // query.isVerifiedProduct = true;
      } else if (status === "rejected") {
        query.status = "rejected";
      }

      if (visible === "true") {
        query.isVisible = true;
      } else if (visible === "false") {
        query.isVisible = false;
      }

      const products = await Product.find(query)
        .select(
          "name price sizes productQuantity images category subCategory isVerifiedProduct isVisible status createdAt slug rating",
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Product.countDocuments(query);

      const transformedProducts = products.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        price: product.price,
        sizes: product.sizes,
        productQuantity: product.productQuantity,
        images: product.images,
        category: product.category,
        subCategory: product.subCategory,
        status: product.status,
        createdAt: product.createdAt,
        slug: product.slug,
        isVerifiedProduct: product.isVerifiedProduct,
        isVisible: product.isVisible,
        rating: product.rating,
      }));

      return {
        success: true,
        products: transformedProducts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    }),

  handleVisibilityToggle: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        isVisible: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;

      try {
        if (!store) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store authentication required",
          });
        }

        const Store = await getStoreModel();
        const storeDoc = await Store.findById(store.id).select("status");

        if (!storeDoc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "We couldn't find your store. Sign out and sign in again.",
          });
        }

        // Prevent product visibility updates depending on store status
        switch (storeDoc.status) {
          case StoreStatusEnum.Pending:
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Your store is still pending approval. You cannot update product visibility until it is approved.",
            });

          case StoreStatusEnum.Rejected:
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Your store application was rejected. Please contact support for further details.",
            });

          case StoreStatusEnum.Suspended:
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Your store is currently suspended. You cannot update product visibility at this time.",
            });

          case StoreStatusEnum.Active:
            // Approved stores are allowed to update product visibility
            break;

          default:
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Invalid store status. Please contact support.",
            });
        }

        const Product = await getProductModel();
        const product = await Product.findById(input.productId).select(
          "storeId status isVisible isVerifiedProduct slug",
        );

        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "We couldn't find that product. It may have been deleted — refresh your product list.",
          });
        }

        if (product.storeId.toString() !== store.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "This product belongs to a different store, so it cannot be changed from here.",
          });
        }

        // If the product is not verified, prevent making it visible
        if (!product.isVerifiedProduct && input.isVisible) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "This product cannot be made visible because it has not been verified yet.",
          });
        }
        // Only approved products may be visible
        if (input.isVisible && product.status !== ProductStatusEnum.Approved) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only approved products can be made visible.",
          });
        }
        // Idempotency: avoid unnecessary write
        if (product.isVisible === input.isVisible) {
          return {
            success: true,
            message: `Product already ${input.isVisible ? "shown" : "hidden"}`,
            product: {
              id: (
                product._id as unknown as mongoose.Types.ObjectId
              ).toString(),
              isVisible: product.isVisible,
            },
          };
        }

        // console.log("product", product);
        product.isVisible = input.isVisible;
        await product.save();

        return {
          success: true,
          message: `Product ${
            input.isVisible ? "shown" : "hidden"
          } successfully`,
          product: {
            id: (product._id as unknown as mongoose.Types.ObjectId).toString(),
            isVisible: product.isVisible,
          },
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:store.products.handleVisibilityToggle",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        // handleTRPCError passes TRPCErrors through untouched and replaces
        // everything else with a safe message — Mongoose validation errors
        // otherwise describe our schema paths, and unrecognised library
        // errors were being echoed to the client verbatim.
        throw handleTRPCError(
          error,
          "We couldn't update product visibility. Please try again.",
        );
      }
    }),

  updateProductImagesOrder: baseProcedure
    .input(
      z.object({
        productId: z.string(),
        images: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;
      const { productId, images } = input;

      try {
        if (!store) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store authentication required",
          });
        }

        const Product = await getProductModel();
        const product = await Product.findById(productId)
          .select("images")
          .lean<IProduct>();

        if (!product) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "We couldn't find that product. It may have been deleted — refresh your product list.",
          });
        }

        // validate that the images already exist before rearranging or reordering them
        const isValidImages = images.every((img) =>
          product.images?.includes(img),
        );

        if (!isValidImages) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid image list provided",
          });
        }

        const result = await Product.updateOne(
          { _id: productId, storeId: store.id },
          { $set: { images } },
        );

        // Nothing matched (wrong productId or unauthorized)
        if (result.matchedCount === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "That product either no longer exists or belongs to a different store.",
          });
        }

        // Matched but nothing changed (same images order)
        if (result.modifiedCount === 0) {
          return {
            success: true,
            message: "No changes detected (images already in this order)",
          };
        }

        // Successfully updated
        return {
          success: true,
          message: "Product images updated successfully",
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:store.products.updateProductImagesOrder",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't update product images. Please try again.",
        );
      }
    }),
});
