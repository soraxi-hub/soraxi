import { type NextRequest, NextResponse } from "next/server";

// Mock product data - replace with actual database queries
const mockProducts = [
  {
    id: "1",
    name: "Premium Wireless Headphones",
    slug: "premium-wireless-headphones",
    price: 2500000, // 25,000 NGN in kobo
    productQuantity: 15,
    images: [
      "/placeholder.svg?height=600&width=600",
      "/placeholder.svg?height=600&width=600",
      "/placeholder.svg?height=600&width=600",
    ],
    description:
      "<h3>Premium Sound Quality</h3><p>Experience crystal-clear audio with our premium wireless headphones. Featuring advanced noise cancellation technology and up to 30 hours of battery life.</p><ul><li>Active Noise Cancellation</li><li>30-hour battery life</li><li>Premium materials</li><li>Comfortable fit</li></ul>",
    specifications:
      "<h3>Technical Specifications</h3><table><tr><td><strong>Driver Size:</strong></td><td>40mm</td></tr><tr><td><strong>Frequency Response:</strong></td><td>20Hz - 20kHz</td></tr><tr><td><strong>Battery Life:</strong></td><td>30 hours</td></tr><tr><td><strong>Charging Time:</strong></td><td>2 hours</td></tr><tr><td><strong>Weight:</strong></td><td>250g</td></tr><tr><td><strong>Connectivity:</strong></td><td>Bluetooth 5.0</td></tr></table>",
    category: ["Electronics"],
    subCategory: ["Audio Devices"],
    isVerifiedProduct: true,
    isVisible: true,
    rating: 4.5,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    status: "approved" as const,
  },
  {
    id: "2",
    name: "Stylish Summer Dress",
    slug: "stylish-summer-dress",
    sizes: [
      { size: "S", price: 1500000, quantity: 5 },
      { size: "M", price: 1500000, quantity: 8 },
      { size: "L", price: 1600000, quantity: 3 },
      { size: "XL", price: 1600000, quantity: 2 },
    ],
    productQuantity: 18,
    images: [
      "/placeholder.svg?height=600&width=600",
      "/placeholder.svg?height=600&width=600",
    ],
    description:
      "<h3>Elegant Summer Style</h3><p>Perfect for warm weather, this stylish summer dress combines comfort with elegance. Made from breathable cotton blend fabric.</p><ul><li>100% Cotton blend</li><li>Machine washable</li><li>Available in multiple sizes</li><li>Perfect for casual and semi-formal occasions</li></ul>",
    specifications:
      "<h3>Product Details</h3><table><tr><td><strong>Material:</strong></td><td>Cotton Blend (95% Cotton, 5% Elastane)</td></tr><tr><td><strong>Care Instructions:</strong></td><td>Machine wash cold, tumble dry low</td></tr><tr><td><strong>Fit:</strong></td><td>Regular fit</td></tr><tr><td><strong>Length:</strong></td><td>Knee-length</td></tr><tr><td><strong>Sleeve Type:</strong></td><td>Short sleeve</td></tr></table>",
    category: ["Fashion"],
    subCategory: ["Women's Clothing"],
    isVerifiedProduct: true,
    isVisible: true,
    rating: 4.2,
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-20T00:00:00Z",
    status: "approved" as const,
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // TODO: Replace with actual database query
    const product = mockProducts.find((p) => p.slug === slug);

    if (!product || !request) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
