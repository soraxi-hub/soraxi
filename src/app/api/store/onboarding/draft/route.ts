import { type NextRequest, NextResponse } from "next/server";
import {
  getStoreModel,
  IStore,
  IShippingMethod,
} from "@/lib/db/models/store.model";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";

// import type { IShippingMethod, IPayoutAccount, IStore }  // adjust import as needed

type UpdateData = Partial<
  Pick<
    IStore,
    | "name"
    | "description"
    | "logoUrl"
    | "bannerUrl"
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
    // Check authentication
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // const { storeId, data, progress } = body;
    const { storeId, data } = body;

    // console.log("storeId", storeId);
    // console.log("data", data);
    // console.log("progress", progress);

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    // Get store model and find the store
    const Store = await getStoreModel();
    const store = await Store.findById(storeId);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Verify store ownership
    if (store.storeOwner.toString() !== userData.id) {
      return NextResponse.json(
        { error: "Unauthorized - not store owner" },
        { status: 403 }
      );
    }

    const updateData: UpdateData = {};

    // Update profile data if provided
    if (data.profile) {
      updateData.name = data.profile.name;
      updateData.description = data.profile.description;
      if (data.profile.logoUrl) updateData.logoUrl = data.profile.logoUrl;
      if (data.profile.bannerUrl) updateData.bannerUrl = data.profile.bannerUrl;
    }

    // Update business info if provided
    if (data.businessInfo) {
      updateData.businessInfo = {
        type: data.businessInfo.type,
        businessName: data.businessInfo.businessName,
        registrationNumber: data.businessInfo.registrationNumber,
        taxId: data.businessInfo.taxId,
        documentUrls: data.businessInfo.documentUrls || [],
      };
    }

    // Update shipping methods if provided
    if (data.shipping && Array.isArray(data.shipping)) {
      updateData.shippingMethods = data.shipping as IShippingMethod[];
    }

    // Update terms agreement if provided
    if (data.termsAgreed) {
      updateData.agreedToTermsAt = new Date();
    }

    // Save the updated store data
    await Store.findByIdAndUpdate(storeId, updateData, { new: true });

    return NextResponse.json({
      success: true,
      message: "Draft saved successfully",
    });
  } catch (error) {
    console.error("Error saving onboarding draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * API Route: Get Onboarding Draft
 * Retrieves saved onboarding progress from the database
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    // const session = await getServerSession(authOptions)
    // if (!session?.user?._id) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // TODO: Implement session retrieval logic

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    // Get store model and find the store
    const Store = await getStoreModel();
    const store = await Store.findById(storeId);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // // Verify store ownership
    // if (store.storeOwner.toString() !== session.user._id) {
    //   return NextResponse.json({ error: "Unauthorized - not store owner" }, { status: 403 })
    // }

    // Construct onboarding data from store
    const onboardingData = {
      profile: {
        name: store.name || "",
        description: store.description || "",
        logoUrl: store.logoUrl || "",
        bannerUrl: store.bannerUrl || "",
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
