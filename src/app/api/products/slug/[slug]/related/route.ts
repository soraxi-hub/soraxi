import { type NextRequest, NextResponse } from "next/server";

// Mock related products data - replace with actual database queries
const mockProducts = [
  {
    id: "3",
    name: "Bluetooth Speaker",
    slug: "bluetooth-speaker",
    price: 800000,
    productQuantity: 20,
    images: ["/placeholder.svg?height=300&width=300"],
    category: ["Electronics"],
    subCategory: ["Audio Devices"],
    isVerifiedProduct: true,
    isVisible: true,
    rating: 4.3,
    createdAt: "2024-01-10T00:00:00Z",
    updatedAt: "2024-01-25T00:00:00Z",
    status: "approved" as const,
  },
  {
    id: "4",
    name: "Wireless Earbuds",
    slug: "wireless-earbuds",
    price: 1200000,
    productQuantity: 12,
    images: ["/placeholder.svg?height=300&width=300"],
    category: ["Electronics"],
    subCategory: ["Audio Devices"],
    isVerifiedProduct: true,
    isVisible: true,
    rating: 4.1,
    createdAt: "2024-01-12T00:00:00Z",
    updatedAt: "2024-01-28T00:00:00Z",
    status: "approved" as const,
  },
  {
    id: "5",
    name: "Casual T-Shirt",
    slug: "casual-t-shirt",
    sizes: [
      { size: "S", price: 500000, quantity: 10 },
      { size: "M", price: 500000, quantity: 15 },
      { size: "L", price: 550000, quantity: 8 },
    ],
    productQuantity: 33,
    images: ["/placeholder.svg?height=300&width=300"],
    category: ["Fashion"],
    subCategory: ["Men's Clothing"],
    isVerifiedProduct: true,
    isVisible: true,
    rating: 4.0,
    createdAt: "2024-01-08T00:00:00Z",
    updatedAt: "2024-01-22T00:00:00Z",
    status: "approved" as const,
  },
  {
    id: "6",
    name: "Smart Watch",
    slug: "smart-watch",
    price: 3500000,
    productQuantity: 8,
    images: ["/placeholder.svg?height=300&width=300"],
    category: ["Electronics"],
    subCategory: ["Wearable Technology"],
    isVerifiedProduct: true,
    isVisible: true,
    rating: 4.6,
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2024-01-30T00:00:00Z",
    status: "approved" as const,
  },
];

export async function GET(
  request: NextRequest
  // { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "4");

    // TODO: Replace with actual database query to get related products
    // This should find products in the same category/subcategory as the current product
    const relatedProducts = mockProducts.slice(0, limit);

    return NextResponse.json({ products: relatedProducts });
  } catch (error) {
    console.error("Error fetching related products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
