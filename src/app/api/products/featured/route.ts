import { NextResponse } from "next/server";
import { getProducts } from "@/lib/db/models/product.model";
import { getStoreModel } from "@/lib/db/models/store.model";

/**
 * API Route: Featured Products
 * Returns high-rated, verified products for homepage
 */
export async function GET() {
  try {
    const products = await getProducts({
      visibleOnly: true,
      minRating: 4,
      limit: 12,
    });

    const Store = await getStoreModel();

    // Get store information for each product
    const productsWithStores = await Promise.all(
      products.map(async (product) => {
        const store = await Store.findOne({ storeId: product.storeID })
          .select("name")
          .lean();

        return {
          id: product._id!.toString(),
          name: product.name,
          price: product.price,
          images: product.images,
          category: product.category,
          subCategory: product.subCategory,
          rating: product.rating || 0,
          storeID: product.storeID,
          storeName: store?.name || "Unknown Store",
          slug: product.slug,
          isVerifiedProduct: product.isVerifiedProduct,
          formattedPrice: product.formattedPrice,
        };
      })
    );

    // Filter only verified products
    const verifiedProducts = productsWithStores.filter(
      (p) => p.isVerifiedProduct
    );

    return NextResponse.json({
      success: true,
      products: verifiedProducts,
    });
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
