import { z } from "zod";
import { unstable_cache } from "next/cache";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getProductModel, getProducts } from "@/lib/db/models/product.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { ProductService } from "@/services/products/product.service";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * These home-page/public-listing reads are hit on nearly every request and
 * change infrequently, so they're wrapped in `unstable_cache` with a short
 * revalidate window. Results are JSON round-tripped before returning so the
 * shape is identical on a cache hit vs. a cache miss (guards against
 * Mongoose-specific types like ObjectId/Date serializing differently once
 * they pass through Next's cache).
 */
const REVALIDATE_SECONDS = 60;

type PublicProductsInput = Parameters<
  typeof ProductService.getPublicProducts
>[0];
type PublicProductsResult = Awaited<
  ReturnType<typeof ProductService.getPublicProducts>
>;

const getCachedPublicProducts = unstable_cache(
  async (input: PublicProductsInput): Promise<PublicProductsResult> => {
    const data = await ProductService.getPublicProducts(input);
    return JSON.parse(JSON.stringify(data));
  },
  ["home:getPublicProducts"],
  { revalidate: REVALIDATE_SECONDS },
);

const getCachedRelatedProducts = unstable_cache(
  async (slug: string, limit: number) => {
    const Product = await getProductModel();

    const currentProduct = await Product.findOne({
      slug,
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
      .limit(limit)
      .lean();

    const formatted = related.map((product) => ({
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

    return JSON.parse(JSON.stringify(formatted)) as typeof formatted;
  },
  ["home:getRelatedProducts"],
  { revalidate: REVALIDATE_SECONDS },
);

const getCachedFeaturedProducts = unstable_cache(
  async () => {
    const products = await getProducts({
      visibleOnly: true,
      minRating: 4,
      limit: 12,
    });

    const formattedProducts = products
      .map((product) => ({
        id: product._id!.toString(),
        name: product.name,
        price: product.price,
        images: product.images,
        category: product.category,
        subCategory: product.subCategory,
        rating: product.rating || 0,
        slug: product.slug,
        isVerifiedProduct: product.isVerifiedProduct,
      }))
      .filter((p) => p.isVerifiedProduct);

    return JSON.parse(JSON.stringify(formattedProducts)) as typeof formattedProducts;
  },
  ["home:getFeaturedProducts"],
  { revalidate: REVALIDATE_SECONDS },
);

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
        const data = await getCachedPublicProducts(input);

        return {
          success: true,
          ...data,
        };
      } catch (err: any) {
        if (isReportableError(err)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(err, {
                source: "trpc:home.getPublicProducts",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
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
        if (isReportableError(err)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(err, {
                source: "trpc:home.getPublicProductBySlug",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
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
        return await getCachedRelatedProducts(input.slug, input.limit);
      } catch (err: any) {
        if (isReportableError(err)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(err, {
                source: "trpc:home.getRelatedProducts",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
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
      return await getCachedFeaturedProducts();
    } catch (err: any) {
      if (isReportableError(err)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(err, {
              source: "trpc:home.getFeaturedProducts",
            }),
          );
        } catch {
          // sendTelegramMessage already console.errors; never mask the original error
        }
      }
      throw handleTRPCError(err, "Failed to fetch featured products.");
    }
  }),
});
