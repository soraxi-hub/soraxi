import { type NextRequest, NextResponse } from "next/server";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { AppError } from "@/lib/errors/app-error";
import { assertValidImageUpload } from "@/validators/validate-image-files";
import bcrypt from "bcryptjs";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import { ProductTypeEnum, StoreStatusEnum } from "@/enums";
import mongoose from "mongoose";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { ProductService } from "@/services/products/product.service";

export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    // const body = await request.json();
    const body = await request.formData();
    const ProductModel = await getProductModel();
    const StoreModel = await getStoreModel();

    // Authenticate store from token
    const storeSession = await getStoreDataFromToken(request);
    if (!storeSession) {
      throw new AppError("UNAUTHORIZED", "Store authentication required", {
        storeId: storeSession,
      });
    }

    // Extract scalar fields
    const storeId = body.get("storeId") as string;
    const name = body.get("name") as string;
    const price = Number(body.get("price"));
    const storePassword = body.get("storePassword") as string;
    const productQuantity = Number(body.get("productQuantity"));
    const description = body.get("description") as string | null;
    const specifications = body.get("specifications") as string | null;
    const submitAction = body.get("submitAction") as "draft" | "publish";
    const submittedDraftProductId =
      (body.get("submittedDraftProductId") as string | null) ?? null;

    // Extract array fields
    const category = body.getAll("category") as string[];
    const subCategory = body.getAll("subCategory") as string[];
    const targetAudience = body.getAll("targetAudience") as string[];

    // Extract image files
    const imageFiles = body.getAll("images") as File[];

    // Count, size and type enforced server-side. The wizard applies the same
    // rules, but until now nothing stopped a request that skipped it.
    assertValidImageUpload(imageFiles);

    // Validate store ownership
    if (storeId !== storeSession.id) {
      throw new AppError(
        "FORBIDDEN",
        "You are signed in to a different store. Switch to the store you want to add this product to.",
        {
          storeId: storeSession.id,
          requestedStoreId: storeId,
        },
      );
    }

    // Check if store exists
    const store = await QueryBuilderFactory.queryBuilder<IStore>(StoreModel)
      .where("_id", new mongoose.Types.ObjectId(storeSession.id))
      .select("password", "status", "verification")
      .executeOne();
    if (!store) {
      throw new AppError(
        "NOT_FOUND",
        "We couldn't find your store. Sign out and sign in again.",
        {
          storeId: storeSession.id,
        },
      );
    }

    // Block suspended stores
    if (store.status === StoreStatusEnum.Suspended) {
      throw new AppError(
        "FORBIDDEN",
        "Your store is suspended, so it cannot be used until the review is resolved. Check your email for the suspension notice, or contact support.",
        { storeId: storeSession.id, status: store.status },
      );
    }

    // Ensure store is active
    if (store.status !== StoreStatusEnum.Active) {
      throw new AppError(
        "FORBIDDEN",
        "Your store isn't live yet. Finish onboarding — store profile, shipping and terms — before adding products.",
        {
          storeId: storeSession.id,
          status: store.status,
        },
      );
    }

    // Verify store password
    const isPasswordValid = await bcrypt.compare(storePassword, store.password);
    if (submitAction === "publish" && !isPasswordValid)
      throw new AppError("UNAUTHORIZED", "Invalid credentials", {
        storeId: storeSession.id,
      });

    // Ensure store can not upload more than 25 products
    const productCount = await QueryBuilderFactory.queryBuilder<IProduct>(
      ProductModel,
    )
      .where("storeId", new mongoose.Types.ObjectId(storeSession.id))
      .count();
    if (productCount >= 25) {
      throw new AppError(
        "BAD_REQUEST",
        "Store has reached the maximum product limit",
        { storeId: storeSession.id, productCount, limit: 25 },
      );
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const form = {
      name,
      storePassword,
      description: description ?? undefined,
      specifications: specifications ?? undefined,
      price: price ?? undefined,
      productQuantity: productQuantity ?? undefined,
      category,
      subCategory,
      targetAudience,
      productType: ProductTypeEnum.Product,
    };

    const result = await ProductService.createProduct({
      form,
      imageFiles,
      submittedDraftProductId,
      storeId: storeSession.id,
      action: submitAction,
      session,
    });

    await session.commitTransaction();

    if (!result) {
      const message =
        submitAction === "draft"
          ? "Error updating product."
          : "Error uploading product.";
      throw new AppError("INTERNAL_SERVER_ERROR", message, {
        storeId: storeSession.id,
        action: submitAction,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        submitAction === "draft"
          ? "Draft published successfully."
          : "Product uploaded successfully.",
      data: {
        productId: (result._id as { toString: typeof toString }).toString(),
      },
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error("Error creating product:", error);
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, { source: "POST /api/store/products" }),
        );
      } catch {
        // sendTelegramMessage already console.errors internally; never mask the original error
      }
    }
    return handleApiError(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
