import { type NextRequest, NextResponse } from "next/server";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getUserDataFromToken } from "@/lib/helpers/getUserDataFromToken";
import { type IStore, type IShippingMethod } from "@/lib/db/models/store.model";

// ----------- Types for incoming request -----------

// Store profile section
interface OnboardingProfile {
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
}

// Business info section
interface OnboardingBusinessInfo {
  type: "individual" | "company";
  businessName?: string;
  registrationNumber?: string;
  taxId?: string;
  documentUrls?: string[];
}

// Full onboarding data payload
interface OnboardingData {
  profile: OnboardingProfile;
  "business-info": OnboardingBusinessInfo;
  shipping: IShippingMethod[];
  termsAgreed: boolean;
}

// Request body format
interface PostBody {
  storeId: string;
  onboardingData: OnboardingData;
  agreementTimestamp: string;
}

/**
 * API Route: Submit Onboarding for Review
 * Finalizes the onboarding process and submits store for admin approval
 * Updates store status and marks onboarding as complete
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse incoming body with expected shape
    const body: PostBody = await request.json();
    const { storeId, onboardingData, agreementTimestamp } = body;

    console.log("Onboarding submission data:", {
      storeId,
      onboardingData,
      agreementTimestamp,
    });

    // Validate required fields
    if (!storeId || !onboardingData) {
      return NextResponse.json(
        { error: "Store ID and onboarding data are required" },
        { status: 400 }
      );
    }

    // Get store model and find the store
    const Store = await getStoreModel();
    const store = await Store.findById(storeId);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Verify that the authenticated user owns this store
    if (store.storeOwner.toString() !== userData.id) {
      return NextResponse.json(
        { error: "Unauthorized - not store owner" },
        { status: 403 }
      );
    }

    // Extract onboarding data sections
    const { profile, shipping, termsAgreed } = onboardingData;
    const businessInfo = onboardingData["business-info"];

    // console.log("businessInfo", businessInfo);

    // Validate profile info
    if (!profile?.name || !profile?.description) {
      return NextResponse.json(
        { error: "Store profile is incomplete" },
        { status: 400 }
      );
    }

    // Validate business info
    if (!businessInfo?.type) {
      return NextResponse.json(
        { error: "Business information is incomplete" },
        { status: 400 }
      );
    }

    if (
      businessInfo.type === "company" &&
      (!businessInfo.businessName || !businessInfo.registrationNumber)
    ) {
      return NextResponse.json(
        { error: "Company registration details are required" },
        { status: 400 }
      );
    }

    // Validate at least one shipping method
    if (!shipping || shipping.length === 0) {
      return NextResponse.json(
        { error: "At least one shipping method is required" },
        { status: 400 }
      );
    }

    // Ensure terms were agreed to
    if (!termsAgreed) {
      return NextResponse.json(
        { error: "Terms agreement is required" },
        { status: 400 }
      );
    }

    /**
     * Build the data structure to update the store with:
     * - Store profile
     * - Business info
     * - Shipping methods
     * - Payout setup
     * - Terms agreement timestamp
     * - Verification and status for admin review
     */
    const updateData: Partial<
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
        | "status"
        | "verification"
      >
    > = {
      // Profile data
      name: profile.name,
      description: profile.description,
      logoUrl: profile.logoUrl || undefined,
      bannerUrl: profile.bannerUrl || undefined,

      // Business info
      businessInfo: {
        type: businessInfo.type,
        businessName: businessInfo.businessName,
        registrationNumber: businessInfo.registrationNumber,
        taxId: businessInfo.taxId,
        documentUrls: businessInfo.documentUrls || [],
      },

      // Shipping methods
      shippingMethods: shipping.map((method) => ({
        name: method.name,
        price: method.price,
        estimatedDeliveryDays: method.estimatedDeliveryDays,
        isActive: true,
        description: method.description,
        applicableRegions: method.applicableRegions || [],
        conditions: method.conditions || {},
      })),

      // Terms agreement date
      agreedToTermsAt: new Date(agreementTimestamp),

      // Mark store as pending for admin review
      status: "pending",

      // Initial verification setup
      verification: {
        isVerified: false, // Will be set to true after admin approval
        method: "email",
        notes: "Onboarding completed, pending admin review",
      },
    };

    // Save the updated store
    const updatedStore = await Store.findByIdAndUpdate(storeId, updateData, {
      new: true,
    });

    if (!updatedStore) {
      return NextResponse.json(
        { error: "Failed to update store" },
        { status: 500 }
      );
    }

    // TODO: Send notification email to admins about new store submission
    // TODO: Send confirmation email to store owner

    // Return success response with summary
    return NextResponse.json({
      success: true,
      message: "Onboarding submitted successfully for review",
      store: {
        id: updatedStore._id,
        name: updatedStore.name,
        status: updatedStore.status,
        verification: updatedStore.verification,
        submittedAt: updatedStore.agreedToTermsAt,
      },
    });
  } catch (error) {
    console.error("Error submitting onboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
