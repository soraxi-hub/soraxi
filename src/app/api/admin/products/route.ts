import { type NextRequest, NextResponse } from "next/server";
import { getProductModel } from "@/lib/db/models/product.model";
import { getStoreModel } from "@/lib/db/models/store.model";

/**
 * API Route: Admin Product Management
 * Handles listing and filtering products for admin moderation
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // const admin = getAdminFromRequest(request)
    // if (!admin || !checkAdminPermission(admin, ["view_products"])) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");

    const Product = await getProductModel();
    const Store = await getStoreModel();

    // Build query
    const query: any = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Get products with store information
    const products = await Product.find(query)
      .populate("storeID", "name storeEmail")
      .select(
        "name description price category status images createdAt updatedAt moderationNotes"
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Product.countDocuments(query);

    // Transform data for frontend
    const transformedProducts = products.map((product: any) => ({
      id: product._id.toString(),
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      status: product.status || "",
      images: product.images || [],
      store: {
        id: product.storeID._id.toString(),
        name: product.storeID.name,
        email: product.storeID.storeEmail,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      moderationNotes: product.moderationNotes,
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
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
