import { type NextRequest, NextResponse } from "next/server";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";

/**
 * API Route: Individual Product Management
 * Handles individual product operations (delete, update, etc.)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
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

    const { productId } = await params;
    const Product = await getProductModel();

    // Find the product and verify ownership
    const product = (await Product.findById(productId)) as IProduct | null;
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.storeID.toString() !== storeSession.id) {
      return NextResponse.json(
        { error: "Unauthorized access to product" },
        { status: 403 }
      );
    }

    // Delete the product
    await Product.findByIdAndDelete(productId);

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
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

    const { productId } = await params;
    const Product = await getProductModel();

    // Find the product and verify ownership
    const product = await Product.findById(productId).lean();
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.storeID.toString() !== storeSession.id) {
      return NextResponse.json(
        { error: "Unauthorized access to product" },
        { status: 403 }
      );
    }

    // Transform product data
    const transformedProduct = {
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      sizes: product.sizes,
      productQuantity: product.productQuantity,
      images: product.images,
      description: product.description,
      specifications: product.specifications,
      category: product.category,
      subCategory: product.subCategory,
      isVerifiedProduct: product.isVerifiedProduct,
      isVisible: product.isVisible,
      slug: product.slug,
      rating: product.rating,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      status: product.isVerifiedProduct ? "approved" : "pending",
    };

    return NextResponse.json({
      success: true,
      product: transformedProduct,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
