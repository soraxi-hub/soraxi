import { type NextRequest, NextResponse } from "next/server";
import {
  getStoreModel,
  IStore,
  IShippingMethod,
} from "@/lib/db/models/store.model";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

type UpdateData = Partial<
  Pick<
    IStore,
    | "name"
    | "description"
    | "shippingMethods"
    | "payoutAccounts"
    | "agreedToTermsAt"
  >
>;

export async function POST(request: NextRequest) {
  try {
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      throw new AppError(
        "UNAUTHORIZED",
        "Your session has expired. Sign in again to save your progress.",
      );
    }

    const body = await request.json();
    const { storeId, data } = body;

    if (!storeId) {
      throw new AppError("BAD_REQUEST", "Store ID is required");
    }

    const Store = await getStoreModel();
    const store = await Store.findById(storeId);

    if (!store) {
      throw new AppError(
        "NOT_FOUND",
        "We couldn't find your store. Sign out and sign in again, or check your profile for the right store.",
        { storeId },
      );
    }

    if (store.storeOwner.toString() !== userData.id) {
      throw new AppError(
        "FORBIDDEN",
        "This store belongs to a different account. Sign in with the account you applied to sell with.",
        {
          storeOwner: store.storeOwner,
          userId: userData.id,
        },
      );
    }

    const updateData: UpdateData = {};

    if (data.profile) {
      updateData.name = data.profile.name;
      updateData.description = data.profile.description;
    }

    if (data.shipping && Array.isArray(data.shipping)) {
      updateData.shippingMethods = data.shipping as IShippingMethod[];
    }

    if (data.termsAgreed) {
      updateData.agreedToTermsAt = new Date();
    }

    await Store.findByIdAndUpdate(storeId, updateData, { new: true });

    return NextResponse.json({
      success: true,
      message: "Draft saved successfully",
    });
  } catch (error) {
    console.error("Error saving onboarding draft:", error);
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, {
            source: "POST /api/store/onboarding/draft",
          }),
        );
      } catch {
        // sendTelegramMessage already console.errors internally; never mask the original error
      }
    }
    return handleApiError(error);
  }
}
