import { type NextRequest, NextResponse } from "next/server";
import { getProductModel } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";
import { getStoreModel } from "@/lib/db/models/store.model";
import { AppError } from "@/lib/errors/app-error";
import bcrypt from "bcryptjs";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { StoreStatusEnum } from "@/validators/store-validators";

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
      storeId,
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
      storePassword, // For verification, not stored
    } = body;

    // Validate required fields
    if (
      !name ||
      !description ||
      !specifications ||
      !category ||
      !subCategory ||
      !images?.length ||
      !storePassword
    ) {
      throw new AppError("Missing required fields", 400);
    }

    // Validate store ownership
    if (storeId !== storeSession.id) {
      throw new AppError("Unauthorized store access", 403);
    }

    const Product = await getProductModel();
    const Store = await getStoreModel();
    const store = await Store.findById(storeSession.id).select(
      "password status verification"
    );
    if (!store) {
      throw new AppError("Store not found", 404);
    }

    // Check if store is suspended
    if (store.status === StoreStatusEnum.Suspended) {
      throw new AppError(
        "Store Suspended. You can not perform this action",
        403
      );
    }

    // Check if store is active and verified
    // if (store.status !== "active" || !store.verification?.isVerified) {
    if (store.status !== StoreStatusEnum.Active) {
      throw new AppError("Store is not verified or active.", 403);
    }

    const isPasswordValid = await bcrypt.compare(storePassword, store.password);
    if (!isPasswordValid) throw new AppError("Invalid credentials", 401);

    // Ensure that store can not upload more than 20 products
    const productCount = await Product.countDocuments({ storeId });
    if (productCount >= 20) {
      throw new AppError("Store has reached the maximum product limit", 400);
    }

    // Create product data
    const productData = {
      storeId: storeSession.id,
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
      isVisible: false, // Until approved by admin, visibility stays hidden. This is necessary to prevent products displaying on the home page or search results
    };

    // Create the product
    const product = new Product(productData);
    await product.save();

    // Update the store by pushing the new product to the products array
    await Store.findByIdAndUpdate(storeId, {
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
    return handleApiError(error);
  }
}
