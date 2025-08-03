import { type NextRequest, NextResponse } from "next/server";
import { getProductModel } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";
import { getStoreModel } from "@/lib/db/models/store.model";

/**
 * API Route: Store Product Management
 * Handles product creation and listing for stores
 */
export async function POST(request: NextRequest) {
  try {
    // Check store authentication
    const storeSession = getStoreDataFromToken(request);
    if (!storeSession) {
      return NextResponse.json(
        { error: "Store authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      storeID,
      productType,
      name,
      price,
      sizes,
      productQuantity,
      images,
      description,
      specifications,
      category,
      subCategory,
    } = body;

    // Validate required fields
    if (
      !name ||
      !description ||
      !specifications ||
      !category ||
      !subCategory ||
      !images?.length
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate store ownership
    if (storeID !== storeSession.id) {
      return NextResponse.json(
        { error: "Unauthorized store access" },
        { status: 403 }
      );
    }

    const Product = await getProductModel();
    const Store = await getStoreModel();

    // Create product data
    const productData = {
      storeID,
      productType: productType || "Product",
      name,
      price: sizes?.length > 0 ? undefined : price,
      sizes: sizes?.length > 0 ? sizes : undefined,
      productQuantity,
      images,
      description,
      specifications,
      category,
      subCategory,
      isVerifiedProduct: false, // Products need admin approval
      isVisible: true,
    };

    // Create the product
    const product = new Product(productData);
    await product.save();

    // Update the store by pushing the new product to the products array
    await Store.findByIdAndUpdate(storeID, {
      $push: { physicalProducts: product._id },
    });

    return NextResponse.json({
      success: true,
      message:
        "Product uploaded successfully! It will be reviewed by our team.",
      product: {
        id: product._id!.toString(),
        name: product.name,
        slug: product.slug,
        status: product.isVerifiedProduct ? "approved" : "pending",
      },
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
