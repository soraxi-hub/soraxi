import { type NextRequest, NextResponse } from "next/server";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import bcrypt from "bcryptjs";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { StoreStatusEnum, ProductTypeEnum } from "@/enums";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import mongoose from "mongoose";
import { ProductService } from "@/services/products/product.service";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  let session: mongoose.ClientSession | null = null;
  try {
    const storeSession = await getStoreDataFromToken(request);
    if (!storeSession) {
      throw new AppError("UNAUTHORIZED", "Store authentication required");
    }

    const body = await request.formData();
    const storeId = body.get("storeId") as string;
    const name = body.get("name") as string;
    const price = Number(body.get("price"));
    const storePassword = body.get("storePassword") as string;
    const productQuantity = Number(body.get("productQuantity"));
    const description = body.get("description") as string | null;
    const specifications = body.get("specifications") as string | null;
    const submitAction = body.get("submitAction") as "draft" | "publish";

    const category = body.getAll("category") as string[];
    const subCategory = body.getAll("subCategory") as string[];
    const targetAudience = body.getAll("targetAudience") as string[];
    const imageFiles = body.getAll("images") as File[];

    if (storeId !== storeSession.id) {
      throw new AppError("FORBIDDEN", "Unauthorized store access", {
        storeId: storeSession.id,
        requestedStoreId: storeId,
      });
    }

    const { productId } = await params;
    const ProductModel = await getProductModel();
    const StoreModel = await getStoreModel();

    const product = await QueryBuilderFactory.queryBuilder<IProduct>(
      ProductModel,
    )
      .where("_id", new mongoose.Types.ObjectId(productId))
      .select("_id", "storeId")
      .executeOne();
    if (!product) {
      throw new AppError("NOT_FOUND", "Product not found", { productId });
    }

    if (product.storeId.toString() !== storeSession.id) {
      throw new AppError("FORBIDDEN", "Unauthorized access to product", {
        productId,
        storeId: storeSession.id,
        productStoreId: product.storeId,
      });
    }

    const store = await QueryBuilderFactory.queryBuilder<IStore>(StoreModel)
      .where("_id", new mongoose.Types.ObjectId(storeSession.id))
      .select("password", "status", "verification")
      .executeOne();
    if (!store) {
      throw new AppError("NOT_FOUND", "Store not found", {
        storeId: storeSession.id,
      });
    }

    if (store.status === StoreStatusEnum.Suspended) {
      throw new AppError(
        "FORBIDDEN",
        "Store Suspended. You can not perform this action",
        {
          storeId: storeSession.id,
          status: store.status,
        },
      );
    }

    if (store.status !== StoreStatusEnum.Active) {
      throw new AppError("FORBIDDEN", "Store is not verified or active.", {
        storeId: storeSession.id,
        status: store.status,
      });
    }

    const isPasswordValid = await bcrypt.compare(storePassword, store.password);
    if (!isPasswordValid) {
      throw new AppError("UNAUTHORIZED", "Invalid credentials", {
        storeId: storeSession.id,
      });
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
      submittedDraftProductId: productId,
      storeId: storeSession.id,
      action: submitAction,
      session,
    });

    if (!result) {
      throw new AppError("INTERNAL_SERVER_ERROR", "Error updating product", {
        storeId: storeSession.id,
        productId,
        action: submitAction,
      });
    }

    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      message: "Draft updated successfully!",
      data: {
        productId: (product._id as { toString: typeof toString }).toString(),
      },
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    console.error("Error updating product:", error);
    return handleApiError(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
