import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getProductModel, getProducts } from "@/lib/db/models/product.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { ProductService } from "@/services/products/product.service";

/**
 * tRPC Router: homeRouter
 * Handles public-facing data fetching like homepage product listings.
 */
export const homeRouter = createTRPCRouter({
  /**
   * Procedure: getPublicProducts
   * Fetches paginated, filtered public product listings (no store data).
   */
  getPublicProducts: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        category: z.string().optional(),
        subCategory: z.string().optional(),
        targetAudience: z.string().optional(),
        verified: z.boolean().optional(),
        search: z.string().optional().nullable(),
        sort: z
          .enum(["newest", "price-asc", "price-desc", "rating-desc"])
          .optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        ratings: z.array(z.number()).optional(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const data = await ProductService.getPublicProducts(input);

        return {
          success: true,
          ...data,
        };
      } catch (err: any) {
        throw handleTRPCError(
          err,
          "Failed to fetch products. Please try again later.",
        );
      }
    }),

  /**
   * Procedure: getPublicProductBySlug
   * Fetches a public product by its slug.
   */
  getPublicProductBySlug: baseProcedure
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { slug } = input;

      try {
        const product = await ProductService.getPublicProductBySlug(slug);

        if (!product) {
          // Return a safe response indicating product not found
          return {
            success: false,
            reason: "PRODUCT_NOT_FOUND",
            product: null,
            storeStatus: null,
          };
        }

        const Store = await getStoreModel();
        const storeDoc = await Store.findById(product.storeId).select("status");

        if (!storeDoc) {
          // Return a safe response indicating store not found
          return {
            success: false,
            reason: "STORE_NOT_FOUND",
            product: null,
            storeStatus: null,
          };
        }

        return {
          success: true,
          product,
          storeStatus: storeDoc.status,
        };
      } catch (err: any) {
        throw handleTRPCError(
          err,
          "Failed to fetch product. Please try again later.",
        );
      }
    }),

  /**
   * Procedure: getRelatedProducts
   * Fetches related products based on the slug of the current product.
   */
  getRelatedProducts: baseProcedure
    .input(
      z.object({
        slug: z.string(),
        limit: z.number().optional().default(4),
      }),
    )
    .query(async ({ input }) => {
      try {
        const Product = await getProductModel();

        const currentProduct = await Product.findOne({
          slug: input.slug,
          isVerifiedProduct: true,
          isVisible: true,
        }).lean();

        if (!currentProduct) {
          return [];
        }

        const related = await Product.find({
          slug: { $ne: currentProduct.slug },
          isVerifiedProduct: true,
          isVisible: true,
          category: { $in: currentProduct.category },
        })
          .sort({ rating: -1 })
          .limit(input.limit)
          .lean();

        return related.map((product) => ({
          id: product._id.toString(),
          name: product.name,
          images: product.images,
          sizes: product.sizes,
          category: product.category,
          subCategory: product.subCategory,
          rating: product.rating || 0,
          storeId: product.storeId.toString(),
          slug: product.slug,
          isVerifiedProduct: product.isVerifiedProduct,
          price: product.price,
        }));
      } catch (err: any) {
        throw handleTRPCError(err, "Failed to fetch related products.");
      }
    }),

  /**
   * Query: Get Featured Products
   * Returns a list of verified, high-rated, and visible products
   * for use on the homepage carousel or promotion section.
   */
  getFeaturedProducts: baseProcedure.query(async () => {
    try {
      const products = await getProducts({
        visibleOnly: true,
        minRating: 4,
        limit: 12,
      });

      const formattedProducts = products.map((product) => ({
        id: product._id!.toString(),
        name: product.name,
        price: product.price,
        images: product.images,
        category: product.category,
        subCategory: product.subCategory,
        rating: product.rating || 0,
        slug: product.slug,
        isVerifiedProduct: product.isVerifiedProduct,
      }));

      return formattedProducts.filter((p) => p.isVerifiedProduct);
    } catch (err: any) {
      throw handleTRPCError(err, "Failed to fetch featured products.");
    }
  }),
});
