import { type NextRequest, NextResponse } from "next/server";
import { getProductModel } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import bcrypt from "bcryptjs";
import { getStoreModel } from "@/lib/db/models/store.model";
import { handleApiError } from "@/lib/utils/handle-api-error";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    // Check store authentication
    const storeSession = await getStoreDataFromToken(request);
    if (!storeSession) {
      throw new AppError("Store authentication required", 401);
    }

    const body = await request.json();
    // Basic validation (more comprehensive validation should happen in the form/schema)
    const {
      name,
      price,
      productQuantity,
      images, // This will now contain Cloudinary URLs
      description,
      specifications,
      category,
      subCategory,
      storePassword, // For verification, not stored
    } = body;

    if (
      !name ||
      !price ||
      !productQuantity ||
      !description ||
      !specifications ||
      !category ||
      !subCategory ||
      !storePassword
    ) {
      throw new AppError("Missing required fields", 400);
    }

    const { productId } = await params;
    const Product = await getProductModel();

    // Find the product and verify ownership
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (product.storeId.toString() !== storeSession.id) {
      // Ensure comparison is string to string
      throw new AppError("Unauthorized access to product", 403);
    }

    const Store = await getStoreModel();
    const store = await Store.findById(storeSession.id).select("password");
    if (!store) {
      throw new AppError("Store not found", 404);
    }

    const isPasswordValid = await bcrypt.compare(storePassword, store.password);
    if (!isPasswordValid) throw new AppError("Invalid credentials", 401);

    // Update product fields
    product.name = name;
    product.price = price;
    product.productQuantity = productQuantity;
    product.description = description;
    product.specifications = specifications;
    product.category = category; // Assuming category is an array of strings
    product.subCategory = subCategory; // Assuming subCategory is an array of strings
    product.images = images; // Images are already Cloudinary URLs from the client

    // Mark product as pending review again if significant changes are made
    // Or if it was previously approved and now modified
    if (product.isVerifiedProduct) {
      product.isVerifiedProduct = false; // Requires re-verification
      product.status = "pending";
    }

    await product.save();

    return NextResponse.json({
      success: true,
      message: "Product updated successfully and is pending re-review.",
      product: {
        id: (product._id as { toString: typeof toString }).toString(),
        name: product.name,
      },
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return handleApiError(error);
  }
}
