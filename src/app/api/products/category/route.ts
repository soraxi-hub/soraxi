import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const subcategory = searchParams.get("subcategory");
    const sort = searchParams.get("sort") || "relevance";
    const priceMin = Number.parseInt(searchParams.get("priceMin") || "0");
    const priceMax = Number.parseInt(searchParams.get("priceMax") || "1000000");
    const inStock = searchParams.get("inStock") === "true";
    const ratings =
      searchParams.get("ratings")?.split(",").filter(Boolean).map(Number) || [];
    // const brands = searchParams.get("brands")?.split(",").filter(Boolean) || []

    // Mock data - replace with actual database query
    const mockProducts = [
      {
        id: "1",
        name: "iPhone 15 Pro Max",
        slug: "iphone-15-pro-max",
        price: 850000,
        originalPrice: 900000,
        images: ["/placeholder.svg?height=300&width=300"],
        rating: 4.8,
        reviewCount: 124,
        inStock: true,
        isNew: true,
        discount: 6,
        storeName: "TechHub Store",
        category: "electronics",
        subcategory: "mobile-phones",
      },
      {
        id: "2",
        name: "Samsung Galaxy S24 Ultra",
        slug: "samsung-galaxy-s24-ultra",
        price: 780000,
        images: ["/placeholder.svg?height=300&width=300"],
        rating: 4.6,
        reviewCount: 89,
        inStock: true,
        storeName: "Mobile World",
        category: "electronics",
        subcategory: "mobile-phones",
      },
      {
        id: "3",
        name: 'MacBook Pro 16"',
        slug: "macbook-pro-16",
        price: 1200000,
        images: ["/placeholder.svg?height=300&width=300"],
        rating: 4.9,
        reviewCount: 67,
        inStock: false,
        storeName: "Apple Store",
        category: "electronics",
        subcategory: "computers",
      },
    ];

    // Filter products based on parameters
    const filteredProducts = mockProducts.filter((product) => {
      if (product.category !== category) return false;
      if (subcategory && product.subcategory !== subcategory) return false;
      if (product.price < priceMin || product.price > priceMax) return false;
      if (inStock && !product.inStock) return false;
      if (
        ratings.length > 0 &&
        !ratings.some((rating) => product.rating >= rating)
      )
        return false;

      return true;
    });

    // Sort products
    switch (sort) {
      case "price-low":
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        filteredProducts.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        filteredProducts.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      default:
        // relevance - keep original order
        break;
    }

    return NextResponse.json({
      products: filteredProducts,
      total: filteredProducts.length,
      filters: {
        availableBrands: ["Apple", "Samsung", "Sony", "LG"],
        priceRange: [0, 1500000],
        categories: ["electronics", "fashion", "home"],
      },
    });
  } catch (error) {
    console.error("Error fetching category products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
