import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import {
  getProductBySlug,
  getProductModel,
  getProducts,
} from "@/lib/db/models/product.model";
import { TRPCError } from "@trpc/server";
import { getStoreModel } from "@/lib/db/models/store.model";

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
        // verified,
        search,
        sort,
        priceMin,
        priceMax,
        ratings,
      } = input;

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
          throw new TRPCError({
            message: "Product not found",
            code: "NOT_FOUND",
          });
        }

        // Check that the store this product belongs to is still
        // active and not susspended or any other status other than active.
        // This will be done client side when we pass the store status to the client.

        const Store = await getStoreModel();
        const storeDoc = await Store.findById(product.storeId).select("status");

        if (!storeDoc) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Store not found",
          });
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
        // 🔹 Detect network-related issues
        if (
          err?.code === "ENOTFOUND" ||
          err?.name === "MongoNetworkError" ||
          err?.message?.includes("getaddrinfo")
        ) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "NETWORK_ERROR", // <- client can detect this
            cause: err,
          });
        }

        // 🔹 Fallback: any other server error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch product. Please try again later.",
          cause: err,
        });
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
      const Product = await getProductModel();

      // Step 1: Find the current product using the slug
      const currentProduct = await Product.findOne({
        slug: input.slug,
        isVerifiedProduct: true,
        isVisible: true,
      }).lean();

      // If the product is not found (e.g., not visible or doesn't exist),
      // return an empty array instead of throwing an error to avoid breaking the frontend flow.
      if (!currentProduct) {
        return [];
        // throw new TRPCError({
        //   code: "NOT_FOUND",
        //   message: "Product not found",
        // });
      }

      // Step 2: Find related products in the same category (excluding the current product)
      const related = await Product.find({
        slug: { $ne: currentProduct.slug },
        isVerifiedProduct: true,
        isVisible: true,
        category: { $in: currentProduct.category },
      })
        .sort({ rating: -1 })
        .limit(input.limit)
        .lean();

      // Step 3: Return formatted result
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
    }),

  /**
   * Query: Get Featured Products
   * Returns a list of verified, high-rated, and visible products
   * for use on the homepage carousel or promotion section.
   */
  getFeaturedProducts: baseProcedure.query(async () => {
    const products = await getProducts({
      visibleOnly: true,
      minRating: 4, // threshold for 'featured' (can be adjusted)
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

    // Return only verified products
    return formattedProducts.filter((p) => p.isVerifiedProduct);
  }),

  /**
   * Public: Get Categories with Product Count
   * Uses MongoDB aggregation to count verified, visible products by category.
   */
  getCategories: baseProcedure.query(async () => {
    const Product = await getProductModel();

    // Perform aggregation to get category counts
    const categoryStats = await Product.aggregate([
      { $match: { isVerifiedProduct: true, isVisible: true } },
      { $unwind: "$category" },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Icon mapping for known categories (you can extend this list)
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

    // Shape result for frontend consumption
    return categoryStats.map((stat) => ({
      name: (stat._id as string).toString(),
      count: stat.count,
      icon: categoryIcons[stat._id] || "📦", // Default icon
      image: `/placeholder.svg?height=100&width=100`,
    }));
  }),
});
