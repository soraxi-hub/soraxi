import { type NextRequest, NextResponse } from "next/server";
import { getProductModel } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

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

export async function GET(request: NextRequest) {
  try {
    // Check store authentication
    const storeSession = await getStoreFromCookie();
    if (!storeSession) {
      return NextResponse.json(
        { error: "Store authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status"); // "pending", "approved", "rejected"

    const Product = await getProductModel();

    // Build query for store's products
    const query: { [key: string]: any } = { storeID: storeSession.id };

    if (status === "pending") {
      query.isVerifiedProduct = false;
    } else if (status === "approved") {
      query.isVerifiedProduct = true;
    }

    // Get products
    const products = await Product.find(query)
      .select(
        "name price sizes productQuantity images category subCategory isVerifiedProduct isVisible createdAt slug"
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Product.countDocuments(query);

    // Transform data
    const transformedProducts = products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      sizes: product.sizes,
      productQuantity: product.productQuantity,
      images: product.images,
      category: product.category,
      subCategory: product.subCategory,
      status: product.isVerifiedProduct ? "approved" : "pending",
      createdAt: product.createdAt,
      slug: product.slug,
      isVerifiedProduct: product.isVerifiedProduct,
      isVisible: product.isVisible,
    }));

    return NextResponse.json({
      success: true,
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching store products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
