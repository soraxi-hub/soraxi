import { type NextRequest, NextResponse } from "next/server";
import { getProductModel } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";
import { getStoreModel } from "@/lib/db/models/store.model";
import { AppError } from "@/lib/errors/app-error";
import bcrypt from "bcryptjs";
import { handleApiError } from "@/lib/utils/handle-api-error";
import {
  ProductActionEnum,
  ProductStatusEnum,
  ProductTypeEnum,
} from "@/validators/product-validators";
import { StoreStatusEnum } from "@/validators/store-validators";
import { productName } from "@/validators/product-validators";
import mongoose from "mongoose";

/**
 * API Route: Store Product Management
 * Handles product creation (draft or publish) for stores
 */
export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;
  session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await request.json();
    const Product = await getProductModel();
    const Store = await getStoreModel();

    // Authenticate store from token
    const storeSession = getStoreDataFromToken(request);
    if (!storeSession) {
      return NextResponse.json(
        { error: "Store authentication required" },
        { status: 401 }
      );
    }

    // Extract data from body
    const {
      storeId,
      // productType,
      name,
      price,
      sizes,
      productQuantity,
      images,
      description,
      specifications,
      category,
      subCategory,
      storePassword, // Used for verification only
      submitAction,
      submittedDraftProductId, // If editing/upgrading an existing draft
    } = body;

    // Validate store ownership
    if (storeId !== storeSession.id) {
      throw new AppError("Unauthorized store access", 403);
    }

    // Check if store exists
    const store = await Store.findById(storeSession.id).select(
      "password status verification"
    );
    if (!store) {
      throw new AppError("Store not found", 404);
    }

    // Block suspended stores
    if (store.status === StoreStatusEnum.Suspended) {
      throw new AppError(
        "Store Suspended. You can not perform this action",
        403
      );
    }

    // Ensure store is active
    if (store.status !== StoreStatusEnum.Active) {
      throw new AppError("Store is not verified or active.", 403);
    }

    // Verify store password
    const isPasswordValid = await bcrypt.compare(storePassword, store.password);
    if (!isPasswordValid) throw new AppError("Invalid credentials", 401);

    // Ensure store can not upload more than 20 products
    const productCount = await Product.countDocuments({ storeId });
    if (productCount >= 20) {
      throw new AppError("Store has reached the maximum product limit", 400);
    }

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

      // Name must be provided.
      const nameResult = productName.safeParse(name);
      if (!nameResult.success) {
        validationErrors.push(`Name: ${getFirstError(nameResult)}`);
        throw new AppError(
          `Draft validation failed: ${validationErrors.join("; ")}`,
          400
        );
      }

      // If there are validation errors, throw them
      if (validationErrors.length > 0) {
        throw new AppError(
          `Draft validation failed: ${validationErrors.join("; ")}`,
          400
        );
      }

      // Using the "submittedDraftProductId", check for existing draft and update it.
      if (submittedDraftProductId) {
        // ✏️ Update existing draft
        await Product.findByIdAndUpdate(
          new mongoose.Types.ObjectId(submittedDraftProductId as string),
          {
            ...body,
            status: ProductStatusEnum.Draft,
            isVisible: false,
            isVerifiedProduct: false,
          },
          { runValidators: true }
        ).session(session);

        await session.commitTransaction();

        return NextResponse.json({
          success: true,
          message: "Draft updated successfully!",
        });
      }

      // 🆕 Create a new draft
      // We create a new draft if no "submittedDraftProductId" was provided.
      const draft = new Product({
        storeId: storeSession.id,
        productType: ProductTypeEnum.Product,
        status: ProductStatusEnum.Draft,
        name,
        price: sizes?.length > 0 ? undefined : price,
        sizes: sizes?.length > 0 ? sizes : undefined,
        productQuantity,
        images,
        description,
        specifications,
        category,
        subCategory,
        isVerifiedProduct: false,
        isVisible: false, // Draft should not be visible in search/home
      });

      await draft.save({ session });

      // Link draft to store
      await Store.findByIdAndUpdate(storeId, {
        $push: { physicalProducts: draft._id },
      }).session(session);

      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        message: "Draft created successfully!",
        data: { productId: draft._id },
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

      // Additional validation for images
      if (!images || images.length < 3) {
        validationErrors.push("images: At least 3 product images are required");
      }

      // If there are validation errors, throw them
      if (validationErrors.length > 0) {
        throw new AppError(
          `Publish validation failed: ${validationErrors.join("; ")}`,
          400
        );
      }

      if (submittedDraftProductId) {
        // 🔄 Upgrade existing draft → pending publish
        await Product.findByIdAndUpdate(
          submittedDraftProductId,
          {
            ...body,
            status: ProductStatusEnum.Pending,
            isVisible: false, // hidden until admin approval
            isVerifiedProduct: false,
          },
          { runValidators: true }
        ).session(session);

        await session.commitTransaction();

        return NextResponse.json({
          success: true,
          message:
            "Draft published successfully! It will be reviewed by our team.",
        });
      }

      // 🆕 Create new product in pending state
      const product = new Product({
        storeId: storeSession.id,
        productType: ProductTypeEnum.Product,
        status: ProductStatusEnum.Pending,
        name,
        price: sizes?.length > 0 ? undefined : price,
        sizes: sizes?.length > 0 ? sizes : undefined,
        productQuantity,
        images,
        description,
        specifications,
        category,
        subCategory,
        isVerifiedProduct: false,
        isVisible: false,
      });

      await product.save({ session });

      // Link product to store
      await Store.findByIdAndUpdate(storeId, {
        $push: { physicalProducts: product._id },
      }).session(session);

      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        message:
          "Product uploaded successfully! It will be reviewed by our team.",
      });
    }

    throw new AppError("Invalid submit action", 400);
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error("Error creating product:", error);
    return handleApiError(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
