import { type NextRequest, NextResponse } from "next/server";
import { getProductModel } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import bcrypt from "bcryptjs";
import { getStoreModel } from "@/lib/db/models/store.model";
import { handleApiError } from "@/lib/utils/handle-api-error";
import {
  ProductStatusEnum,
  ProductActionEnum,
} from "@/validators/product-validators";
import { productName } from "@/validators/product-validators";
import { StoreStatusEnum } from "@/validators/store-validators";
import { MIN_IMAGE_NUMBER } from "@/domain/products/product-upload";
import { uploadProductImages } from "@/lib/utils/cloudinary/cloudinary-server-side-upload";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    // Check store authentication
    const storeSession = await getStoreDataFromToken(request);
    if (!storeSession) {
      throw new AppError("Store authentication required", 401);
    }

    // const body = await request.json();
    const body = await request.formData();
    // Extract scalar fields
    const storeId = body.get("storeId") as string;
    const name = body.get("name") as string;
    const price = Number(body.get("price"));
    const storePassword = body.get("storePassword") as string;
    const productQuantity = Number(body.get("productQuantity"));
    const description = body.get("description") as string | null;
    const specifications = body.get("specifications") as string | null;
    const submitAction = body.get("submitAction") as "draft" | "publish";

    // Extract array fields
    const category = body.getAll("category") as string[];
    const subCategory = body.getAll("subCategory") as string[];
    const targetAudience = body.getAll("targetAudience") as string[];
    const oldImageURLs = body.getAll("oldImageURLs") as string[];

    // Extract uploaded image files
    const imageFiles = body.getAll("images") as File[];

    // Validate store ownership
    if (storeId !== storeSession.id) {
      throw new AppError("Unauthorized store access", 403);
    }

    const { productId } = await params;
    const Product = await getProductModel();

    // Find the product and verify ownership
    const product = await Product.findById(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    if (product.storeId.toString() !== storeSession.id) {
      throw new AppError("Unauthorized access to product", 403);
    }

    const Store = await getStoreModel();

    // Check if store exists
    const store = await Store.findById(storeSession.id).select(
      "password status verification",
    );
    if (!store) {
      throw new AppError("Store not found", 404);
    }

    // Block suspended stores
    if (store.status === StoreStatusEnum.Suspended) {
      throw new AppError(
        "Store Suspended. You can not perform this action",
        403,
      );
    }

    // Ensure store is active
    if (store.status !== StoreStatusEnum.Active) {
      throw new AppError("Store is not verified or active.", 403);
    }

    // Verify store password
    const isPasswordValid = await bcrypt.compare(storePassword, store.password);
    if (!isPasswordValid) throw new AppError("Invalid credentials", 401);

    // Helper function to get first error message
    const getFirstError = (result: any) =>
      result.error?.errors[0]?.message || "Validation failed";

    /**
     * ======================
     * DRAFT FLOW
     * ======================
     */
    if (submitAction === ProductActionEnum.Draft) {
      // Validate draft fields if they exist (partial validation)
      const validationErrors: string[] = [];

      const nameResult = productName.safeParse(name);
      if (!nameResult.success) {
        validationErrors.push(`Name: ${getFirstError(nameResult)}`);
      }

      // If there are validation errors, throw them
      if (validationErrors.length > 0) {
        throw new AppError(
          `Draft validation failed: ${validationErrors.join("; ")}`,
          400,
        );
      }

      // After all checks, upload image files to cloudinary
      const newImageURLs = await uploadProductImages(imageFiles);

      if (!newImageURLs.success) {
        throw new AppError(
          newImageURLs.error ?? "Server error: Unable to upload Product images",
        );
      }

      // Merge previous image URLs with newly uploaded ones
      const mergedImages = [
        ...oldImageURLs,
        ...(newImageURLs.result as string[]),
      ];

      // Update product fields for draft (only update provided fields)
      if (name !== undefined) product.name = name;
      if (price !== undefined) product.price = price;
      if (productQuantity !== undefined)
        product.productQuantity = productQuantity;
      if (description !== undefined && description !== null)
        product.description = description;
      if (specifications !== undefined && specifications !== null)
        product.specifications = specifications;
      if (category !== undefined) product.category = category;
      if (subCategory !== undefined) product.subCategory = subCategory;
      if (targetAudience !== undefined) product.targetAudience = targetAudience;
      if (mergedImages !== undefined) product.images = mergedImages;

      // Keep as draft
      product.status = ProductStatusEnum.Draft;
      product.isVerifiedProduct = false;
      product.isVisible = false;

      await product.save();

      return NextResponse.json({
        success: true,
        message: "Draft updated successfully!",
        data: {
          productId: (product._id as { toString: typeof toString }).toString(),
        },
      });
    }

    /**
     * ======================
     * PUBLISH FLOW
     * ======================
     */
    if (submitAction === ProductActionEnum.Publish) {
      // Validate publish (strict schema) - all fields required
      const validationErrors: string[] = [];

      // Validate all required fields
      const requiredValidations = [
        { field: "name", value: name, validator: productName },
      ];

      requiredValidations.forEach(({ field, value, validator }) => {
        const result = validator.safeParse(value);
        if (!result.success) {
          validationErrors.push(`${field}: ${getFirstError(result)}`);
        }
      });

      const totalImages = oldImageURLs.length + imageFiles.length;

      // Additional validation for images
      if (totalImages < MIN_IMAGE_NUMBER) {
        validationErrors.push(
          `images: At least ${MIN_IMAGE_NUMBER} product images are required`,
        );
      }

      // If there are validation errors, throw them
      if (validationErrors.length > 0) {
        throw new AppError(
          `Publish validation failed: ${validationErrors.join("; ")}`,
          400,
        );
      }

      // After all checks, upload image files to cloudinary
      const newImageURLs = await uploadProductImages(imageFiles);

      if (!newImageURLs.success) {
        throw new AppError(
          newImageURLs.error ?? "Server error: Unable to upload Product images",
        );
      }

      // Merge previous image URLs with newly uploaded ones
      const mergedImages = [
        ...oldImageURLs,
        ...(newImageURLs.result as string[]),
      ];

      // Update all product fields for publish
      product.name = name;
      product.price = price;
      product.productQuantity = productQuantity;
      product.description = description as string;
      product.specifications = specifications as string;
      product.category = category;
      product.subCategory = subCategory;
      product.targetAudience = targetAudience;
      product.images = mergedImages;

      // Set status based on previous state
      if (product.isVerifiedProduct) {
        // If product was previously verified, mark for re-review
        product.isVerifiedProduct = false;
        product.status = ProductStatusEnum.Pending;
        product.isVisible = false;
      } else {
        // If product was draft or pending, keep as pending
        product.status = ProductStatusEnum.Pending;
        product.isVerifiedProduct = false;
        product.isVisible = false;
      }

      await product.save();

      return NextResponse.json({
        success: true,
        message: "Product updated successfully and is pending review!",
        data: {
          productId: (product._id as { toString: typeof toString }).toString(),
        },
      });
    }

    throw new AppError("Invalid submit action", 400);
  } catch (error) {
    console.error("Error updating product:", error);
    return handleApiError(error);
  }
}
