import { type NextRequest, NextResponse } from "next/server";
import {
  getStoreModel,
  IStore,
  IShippingMethod,
} from "@/lib/db/models/store.model";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

type UpdateData = Partial<
  Pick<
    IStore,
    | "name"
    | "description"
    | "businessInfo"
    | "shippingMethods"
    | "payoutAccounts"
    | "agreedToTermsAt"
  >
>;

/**
 * API Route: Save Onboarding Draft
 * Saves the current onboarding progress to the database
 * Allows users to resume their onboarding later
 */
export async function POST(request: NextRequest) {
  try {
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      throw new AppError("UNAUTHORIZED", "Unauthorized");
    }

    const body = await request.json();
    const { storeId, data } = body;

    if (!storeId) {
      throw new AppError("BAD_REQUEST", "Store ID is required");
    }

    const Store = await getStoreModel();
    const store = await Store.findById(storeId);

    if (!store) {
      throw new AppError("NOT_FOUND", "Store not found", { storeId });
    }

    if (store.storeOwner.toString() !== userData.id) {
      throw new AppError("FORBIDDEN", "Unauthorized - not store owner", {
        storeOwner: store.storeOwner,
        userId: userData.id,
      });
    }

    const updateData: UpdateData = {};

    if (data.profile) {
      updateData.name = data.profile.name;
      updateData.description = data.profile.description;
    }

    if (data.businessInfo) {
      updateData.businessInfo = {
        type: data.businessInfo.type,
        businessName: data.businessInfo.businessName,
        registrationNumber: data.businessInfo.registrationNumber,
        documentUrls: data.businessInfo.documentUrls || [],
      };
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
    return handleApiError(error);
  }
}

/**
 * API Route: Get Onboarding Draft
 * Retrieves saved onboarding progress from the database
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Implement proper authentication (currently commented out)
    // const session = await getServerSession(authOptions)
    // if (!session?.user?._id) {
    //   throw new AppError("UNAUTHORIZED", "Unauthorized")
    // }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      throw new AppError("BAD_REQUEST", "Store ID is required");
    }

    const Store = await getStoreModel();
    const store = await Store.findById(storeId);

    if (!store) {
      throw new AppError("NOT_FOUND", "Store not found", { storeId });
    }

    // // Verify store ownership
    // if (store.storeOwner.toString() !== session.user._id) {
    //   throw new AppError("FORBIDDEN", "Unauthorized - not store owner")
    // }

    const onboardingData = {
      profile: {
        name: store.name || "",
        description: store.description || "",
      },
      businessInfo: store.businessInfo || {
        type: "individual",
        businessName: "",
        registrationNumber: "",
        taxId: "",
        documentUrls: [],
      },
      shipping: store.shippingMethods || [],
      payout: store.payoutAccounts?.[0] || null,
      termsAgreed: !!store.agreedToTermsAt,
    };

    return NextResponse.json({
      success: true,
      data: onboardingData,
      store: {
        id: store._id,
        status: store.status,
        verification: store.verification,
      },
    });
  } catch (error) {
    console.error("Error retrieving onboarding draft:", error);
    return handleApiError(error);
  }
}
