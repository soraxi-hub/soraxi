import { type NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/db/models/product.model";
import { getStoreModel } from "@/lib/db/models/store.model";

/**
 * API Route: Public Products
 * Returns products for public viewing (homepage, search, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const verified = searchParams.get("verified") === "true";
    const search = searchParams.get("search");

    const options: {
      visibleOnly: boolean;
      limit: number;
      skip: number;
      category?: string;
    } = {
      visibleOnly: true,
      limit,
      skip: (page - 1) * limit,
    };

    if (category && category !== "all") {
      options.category = category;
    }

    const products = await getProducts(options);
    const Store = await getStoreModel();

    // Get store information and filter products
    let productsWithStores = await Promise.all(
      products.map(async (product) => {
        const store = await Store.findOne({ storeId: product.storeID })
          .select("name")
          .lean();

        return {
          id: product._id,
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

    // Apply filters
    if (verified) {
      productsWithStores = productsWithStores.filter(
        (p) => p.isVerifiedProduct
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      productsWithStores = productsWithStores.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.category.some((cat) => cat.toLowerCase().includes(searchLower)) ||
          p.storeName.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      products: productsWithStores,
      pagination: {
        page,
        limit,
        total: productsWithStores.length,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
