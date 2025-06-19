import { type NextRequest, NextResponse } from "next/server";
import { getProductModel } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";

/**
 * API Route: Product Visibility Toggle
 * Handles toggling product visibility for stores
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    // Check store authentication
    const storeSession = getStoreDataFromToken(request);
    if (!storeSession) {
      return NextResponse.json(
        { error: "Store authentication required" },
        { status: 401 }
      );
    }

    const { productId } = params;
    const { isVisible } = await request.json();

    const Product = await getProductModel();

    // Find the product and verify ownership
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.storeID.toString() !== storeSession.id) {
      return NextResponse.json(
        { error: "Unauthorized access to product" },
        { status: 403 }
      );
    }

    // Update visibility
    product.isVisible = isVisible;
    await product.save();

    return NextResponse.json({
      success: true,
      message: `Product ${isVisible ? "shown" : "hidden"} successfully`,
      product: {
        id: product._id!.toString(),
        isVisible: product.isVisible,
      },
    });
  } catch (error) {
    console.error("Error updating product visibility:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
