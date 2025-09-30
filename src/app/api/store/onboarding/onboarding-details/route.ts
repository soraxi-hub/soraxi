import { type NextRequest, NextResponse } from "next/server";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import {
  getStoreFromCookie,
  StoreTokenData,
} from "@/lib/helpers/get-store-from-cookie";
import { AppError } from "@/lib/errors/app-error";
import mongoose from "mongoose";
import { koboToNaira } from "@/lib/utils/naira";
import { StoreBusinessInfoEnum } from "@/validators/store-validators";

/**
 * API Route: Get Store Onboarding Details
 * Returns the Store Onboarding Details of the user's store
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const storeData = (await getStoreFromCookie()) as StoreTokenData;

    if (!storeData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const Store = await getStoreModel();
    const store = (await Store.findById(storeData.id)
      .select(
        "name description logoUrl bannerUrl businessInfo shippingMethods agreedToTermsAt"
      )
      .lean()) as IStore | null;

    if (!store) {
      throw new AppError(
        "Store not found",
        400,
        "NOT_FOUND",
        "Store not found"
      );
    }

    // Determine progress
    const progressSteps = {
      profile: !!(store.name && store.description),
      "business-info": !!(
        store.businessInfo &&
        (store.businessInfo.type === StoreBusinessInfoEnum.Individual ||
          (store.businessInfo.type === StoreBusinessInfoEnum.Company &&
            store.businessInfo.businessName &&
            store.businessInfo.registrationNumber))
      ),
      shipping: !!(store.shippingMethods?.length > 0),
      terms: !!store.agreedToTermsAt,
    };

    const completedSteps = Object.entries(progressSteps)
      .filter(([_, complete]) => complete)
      .map(([key]) => key);

    const totalSteps = Object.keys(progressSteps).length;
    const currentStep = completedSteps.length;
    const percentage = Math.round((completedSteps.length / totalSteps) * 100);

    const shippingMethods = (store.shippingMethods ?? []).map(
      (shippingMethod) => {
        return {
          ...shippingMethod,
          price: koboToNaira(shippingMethod.price),
        };
      }
    );

    return NextResponse.json({
      success: true,
      store: {
        storeId: (store._id as unknown as mongoose.Types.ObjectId).toString(),
        data: {
          profile: {
            name: store.name,
            description: store.description,
            logoUrl: store.logoUrl,
            bannerUrl: store.bannerUrl,
          },
          "business-info": store.businessInfo || {},
          shipping: shippingMethods,
          terms: store.agreedToTermsAt,
        },
        progress: {
          currentStep,
          completedSteps,
          totalSteps,
          percentage,
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
