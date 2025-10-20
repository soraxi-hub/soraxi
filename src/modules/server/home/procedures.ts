import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import {
  getProductBySlug,
  getProductModel,
  getProducts,
} from "@/lib/db/models/product.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";

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
        verified: z.boolean().optional(),
        search: z.string().optional().nullable(),
        sort: z
          .enum(["newest", "price-asc", "price-desc", "rating-desc"])
          .optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        ratings: z.array(z.number()).optional(),
      })
    )
    .query(async ({ input }) => {
      const {
        page,
        limit,
        category,
        subCategory,
        search,
        sort,
        priceMin,
        priceMax,
        ratings,
      } = input;

      try {
        const products = await getProducts({
          visibleOnly: true,
          limit,
          skip: (page - 1) * limit,
          category: category !== "all" ? category : undefined,
          subCategory,
          verified: true,
          search,
          sort,
          priceMin,
          priceMax,
          ratings,
        });

        const formattedProducts = products.map((product) => ({
          id: (product._id as string).toString(),
          name: product.name,
          price: product.price,
          images: product.images,
          category: product.category,
          subCategory: product.subCategory,
          rating: product.rating || 0,
          slug: product.slug,
          isVerifiedProduct: product.isVerifiedProduct,
        }));

        return {
          success: true,
          products: formattedProducts,
          pagination: {
            page,
            limit,
            total: formattedProducts.length,
          },
        };
      } catch (err: any) {
        throw handleTRPCError(
          err,
          "Failed to fetch products. Please try again later."
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
      })
    )
    .query(async ({ input }) => {
      const { slug } = input;

      try {
        const product = await getProductBySlug(slug);

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

        const formattedProduct = {
          id: (product._id as string).toString(),
          storeId: product.storeId.toString(),
          productType: product.productType,
          name: product.name,
          description: product.description,
          specifications: product.specifications,
          productQuantity: product.productQuantity,
          sizes: product.sizes,
          price: product.price,
          images: product.images,
          category: product.category,
          subCategory: product.subCategory,
          rating: product.rating || 0,
          slug: product.slug,
          isVerifiedProduct: product.isVerifiedProduct,
        };

        return {
          success: true,
          product: formattedProduct,
          storeStatus: storeDoc.status,
        };
      } catch (err: any) {
        // if (
        //   err?.code === "ENOTFOUND" ||
        //   err?.name === "MongoNetworkError" ||
        //   err?.message?.includes("getaddrinfo")
        // ) {
        //   throw new TRPCError({
        //     code: "INTERNAL_SERVER_ERROR",
        //     message: "NETWORK_ERROR",
        //     cause: err,
        //   });
        // }

        throw handleTRPCError(
          err,
          "Failed to fetch product. Please try again later."
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
      })
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
          id: (product._id as string).toString(),
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
        id: (product._id as string).toString(),
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

  /**
   * Public: Get Categories with Product Count
   * Uses MongoDB aggregation to count verified, visible products by category.
   */
  getCategories: baseProcedure.query(async () => {
    try {
      const Product = await getProductModel();

      const categoryStats = await Product.aggregate([
        { $match: { isVerifiedProduct: true, isVisible: true } },
        { $unwind: "$category" },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const categoryIcons: Record<string, string> = {
        Electronics: "📱",
        "Clothing & Fashion": "👕",
        "Home & Garden": "🏠",
        "Sports & Outdoors": "⚽",
        "Books & Media": "📚",
        "Health & Beauty": "💄",
        "Toys & Games": "🎮",
        Automotive: "🚗",
        "Food & Beverages": "🍕",
        "Art & Crafts": "🎨",
      };

      return categoryStats.map((stat) => ({
        name: (stat._id as string).toString(),
        count: stat.count,
        icon: categoryIcons[stat._id] || "📦",
        image: `/placeholder.svg?height=100&width=100`,
      }));
    } catch (err: any) {
      throw handleTRPCError(err, "Failed to fetch product categories.");
    }
  }),
});
