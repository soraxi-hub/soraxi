import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getProductById } from "@/lib/db/models/product.model";

export const storeProductRouter = createTRPCRouter({
  /**
   * This method is used by the edit product page to fetch store product for editing.
   */
  getStoreProductById: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { store } = ctx;

      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store authentication required",
        });
      }

      const product = await getProductById(input.id);

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      if (product.storeId.toString() !== store.id) {
        // Ensure comparison is string to string
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access to product",
        });
      }

      const transformedProduct = {
        id: (product._id as { toString: typeof toString }).toString(),
        name: product.name,
        price: product.price,
        sizes: product.sizes,
        productQuantity: product.productQuantity,
        images: product.images,
        category: product.category,
        subCategory: product.subCategory,
        description: product.description,
        specifications: product.specifications,
        status: product.status,
        productType: product.productType,
        createdAt: product.createdAt,
        slug: product.slug,
        isVerifiedProduct: product.isVerifiedProduct,
        isVisible: product.isVisible,
        rating: product.rating,
        firstApprovedAt: product.firstApprovedAt,
      };

      return {
        success: true,
        product: transformedProduct,
      };
    }),
});
