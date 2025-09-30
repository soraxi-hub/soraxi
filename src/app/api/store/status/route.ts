import { type NextRequest, NextResponse } from "next/server";
import { getStoreModel } from "@/lib/db/models/store.model";
import {
  getStoreFromCookie,
  StoreTokenData,
} from "@/lib/helpers/get-store-from-cookie";
import { StoreBusinessInfoEnum } from "@/validators/store-validators";

/**
 * API Route: Get Store Status
 * Returns the current status and onboarding progress of the user's store
 * Used by middleware to determine access permissions
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const storeData = (await getStoreFromCookie()) as StoreTokenData;

    if (!storeData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get store model and find user's store
    const Store = await getStoreModel();
    const store = await Store.findById(storeData.id).select(
      "name description logoUrl bannerUrl businessInfo shippingMethods status verification agreedToTermsAt"
    );

    if (!store) {
      return NextResponse.json({
        success: true,
        store: null,
        message: "No store found for user",
      });
    }

    // Calculate onboarding completion status
    const onboardingStatus = {
      profileComplete: !!(store.name && store.description),
      businessInfoComplete: !!(
        store.businessInfo &&
        (store.businessInfo.type === StoreBusinessInfoEnum.Individual ||
          (store.businessInfo.type === StoreBusinessInfoEnum.Company &&
            store.businessInfo.businessName &&
            store.businessInfo.registrationNumber))
      ),
      shippingComplete: !!(
        store.shippingMethods && store.shippingMethods.length > 0
      ),
      termsComplete: !!store.agreedToTermsAt,
    };

    const completedSteps =
      Object.values(onboardingStatus).filter(Boolean).length;
    const totalSteps = Object.keys(onboardingStatus).length;
    const isOnboardingComplete = completedSteps === totalSteps;

    return NextResponse.json({
      success: true,
      store: {
        id: store._id,
        name: store.name,
        status: store.status,
        verification: store.verification,
        onboarding: {
          ...onboardingStatus,
          isComplete: isOnboardingComplete,
          completedSteps,
          totalSteps,
          percentage: Math.round((completedSteps / totalSteps) * 100),
        },
      },
    });
  } catch (error) {
    console.error("Error getting store status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
