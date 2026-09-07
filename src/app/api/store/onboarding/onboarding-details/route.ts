import { type NextRequest, NextResponse } from "next/server";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import mongoose from "mongoose";
import { koboToNaira } from "@/lib/utils/naira";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import { computeStoreOnboardingStats } from "@/domain/stores/onboarding-stats";

/**
 * API Route: Get Store Onboarding Details
 * Returns the Store Onboarding Details of the user's store
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const storeData = await getStoreFromCookie();

    if (!storeData) {
      throw new AppError(
        "UNAUTHORIZED",
        "Your session has expired. Sign in again to continue setting up your store.",
      );
    }

    const Store = await getStoreModel();
    const store = (await Store.findById(storeData.id)
      .select(
        "name description logoUrl bannerUrl businessInfo shippingMethods agreedToTermsAt",
      )
      .lean()) as IStore | null;

    if (!store) {
      throw new AppError(
        "NOT_FOUND",
        "We couldn't find your store. Sign out and sign in again, or check your profile for the right store.",
        {
          storeId: storeData.id,
        },
      );
    }

    const onboardingStats = computeStoreOnboardingStats(store);

    const shippingMethods = (store.shippingMethods ?? []).map(
      (shippingMethod) => {
        return {
          ...shippingMethod,
          price: koboToNaira(shippingMethod.price),
        };
      },
    );

    return NextResponse.json({
      success: true,
      store: {
        storeId: (store._id as unknown as mongoose.Types.ObjectId).toString(),
        data: {
          profile: {
            name: store.name,
            description: store.description,
          },
          shipping: shippingMethods,
          terms: store.agreedToTermsAt,
        },
        progress: {
          currentStep: onboardingStats.completedSteps,
          completedSteps: onboardingStats.completedStepIds,
          totalSteps: onboardingStats.totalSteps,
          percentage: onboardingStats.percentage,
        },
      },
    });
  } catch (error) {
    console.error("Error getting store status:", error);
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, {
            source: "GET /api/store/onboarding/onboarding-details",
          }),
        );
      } catch {
        // sendTelegramMessage already console.errors internally; never mask the original error
      }
    }
    return handleApiError(error);
  }
}
