import { type NextRequest, NextResponse } from "next/server";
import { getStoreDataFromToken } from "@/lib/helpers/get-store-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { StoreStatusEnum } from "@/enums";
import mongoose from "mongoose";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import {
  ProductDescriptionService,
  type ProductDescriptionContext,
} from "@/services/ai/product-description.service";

export async function POST(request: NextRequest) {
  try {
    const body =
      (await request.json()) as Partial<ProductDescriptionContext> & {
        storeId?: string;
      };

    // ---- Auth ----
    const storeSession = await getStoreDataFromToken(request);
    if (!storeSession) {
      throw new AppError("UNAUTHORIZED", "Store authentication required", {
        storeId: null,
      });
    }

    // ---- Ownership check ----
    if (body.storeId && body.storeId !== storeSession.id) {
      throw new AppError("FORBIDDEN", "Unauthorized store access", {
        storeId: storeSession.id,
        requestedStoreId: body.storeId,
      });
    }

    // ---- Store status check ----
    // We only allow active stores to generate descriptions so bots can't
    // probe the AI endpoint via unverified store tokens.
    const StoreModel = await getStoreModel();
    const store = await QueryBuilderFactory.queryBuilder<IStore>(StoreModel)
      .where("_id", new mongoose.Types.ObjectId(storeSession.id))
      .select("status")
      .executeOne();

    if (!store) {
      throw new AppError("NOT_FOUND", "Store not found", {
        storeId: storeSession.id,
      });
    }
    if (store.status === StoreStatusEnum.Suspended) {
      throw new AppError(
        "FORBIDDEN",
        "Store suspended. You cannot perform this action.",
        { storeId: storeSession.id },
      );
    }
    if (store.status !== StoreStatusEnum.Active) {
      throw new AppError("FORBIDDEN", "Store is not verified or active.", {
        storeId: storeSession.id,
      });
    }

    // ---- Delegate to service ----
    const ctx: ProductDescriptionContext = {
      name: (body.name ?? "").trim(),
      category: body.category,
      subCategory: body.subCategory,
      targetAudience: body.targetAudience,
      price: body.price,
      specifications: body.specifications,
      productType: body.productType,
    };

    const result = await ProductDescriptionService.generate(ctx);

    if (!result.success) {
      // Surface retryable vs permanent so the frontend can tailor the message
      const status = result.kind === "retryable" ? 503 : 422;
      return NextResponse.json(
        {
          success: false,
          message: result.error,
          retryable: result.kind === "retryable",
        },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      description: result.description,
    });
  } catch (error) {
    console.error("[generate-description] Error:", error);
    return handleApiError(error);
  }
}
