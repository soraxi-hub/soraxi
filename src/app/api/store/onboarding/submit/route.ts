import { type NextRequest, NextResponse } from "next/server";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getUserModel } from "@/lib/db/models/user.model";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { type IStore, type IShippingMethod } from "@/lib/db/models/store.model";
import {
  StoreBusinessInfoEnum,
  StoreStatusEnum,
  StoreVerificationStatusEnum,
} from "@/validators/store-validators";
import {
  AdminNotificationEmail,
  NotificationFactory,
  renderTemplate,
  StoreOnboardingEmail,
} from "@/domain/notification";
import React from "react";
import { EmailTextTemplates } from "@/lib/utils/email-text-templates";

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
  type: StoreBusinessInfoEnum;
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
 * Get store owner name from user data
 */
async function getStoreOwnerName(storeOwnerId: string): Promise<string> {
  try {
    const User = await getUserModel();
    const user = await User.findById(storeOwnerId)
      .select("firstName lastName")
      .lean();

    if (!user) {
      return "Store Owner";
    }

    return `${user.firstName} ${user.lastName}`.trim();
  } catch (error) {
    console.error("Error fetching store owner name:", error);
    return "Store Owner";
  }
}

/**
 * API Route: Submit Onboarding for Review
 * Finalizes the onboarding process and submits store for admin approval
 * Updates store status and marks onboarding as complete
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL) {
      console.error("Missing required environment variables");
      throw new Error(
        "Server configuration error: Missing required SORAXI EMAIL CONFIG environment variables"
      );
    }

    // Check authentication
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse incoming body with expected shape
    const body: PostBody = await request.json();
    const { storeId, onboardingData, agreementTimestamp } = body;

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
      businessInfo.type === StoreBusinessInfoEnum.Company &&
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
      status: StoreStatusEnum.Pending,

      // Initial verification setup
      verification: {
        isVerified: false, // Will be set to true after admin approval
        method: StoreVerificationStatusEnum.Email,
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

    try {
      // Send notification email to admins about new store submission
      const adminEmail = process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL;
      const storeEmail = store.storeEmail;

      // Get store owner name properly
      const storeOwnerName = await getStoreOwnerName(
        store.storeOwner.toString()
      );

      // 1. Send admin notification using AdminNotificationEmail template
      const adminHtml = await renderTemplate(
        React.createElement(AdminNotificationEmail, {
          title: "New Store Submission",
          content: `A new store "${updatedStore.name}" has been submitted for review and requires your attention.`,
          details: {
            "Store Name": updatedStore.name,
            "Store Owner": storeOwnerName,
            "Owner Email": storeEmail,
            "Business Type": businessInfo.type,
            "Submission Date": new Date().toLocaleDateString(),
            "Store ID": updatedStore._id.toString(),
          },
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/stores/${updatedStore._id}`,
          actionLabel: "Review Store",
        })
      );

      const adminText = EmailTextTemplates.generateAdminNotificationText({
        storeName: updatedStore.name,
        storeOwnerName,
        storeEmail,
        businessType: businessInfo.type,
        storeId: updatedStore._id.toString(),
      });

      const adminNotification = NotificationFactory.create("email", {
        recipient: adminEmail,
        subject: `New Store Submission: ${updatedStore.name}`,
        emailType: "adminNotification",
        fromAddress: "admin@soraxihub.com",
        html: adminHtml,
        text: adminText,
        metadata: {
          storeId: updatedStore._id.toString(),
          storeName: updatedStore.name,
          notificationType: "store_submission",
        },
      });

      await adminNotification.send();

      // 2. Send confirmation email to store owner using StoreOnboardingEmail template
      const storeOwnerHtml = await renderTemplate(
        React.createElement(StoreOnboardingEmail, {
          ownerName: storeOwnerName,
          storeName: updatedStore.name,
        })
      );

      const storeOwnerText = EmailTextTemplates.generateStoreOnboardingText({
        ownerName: storeOwnerName,
        storeName: updatedStore.name,
      });

      const storeOwnerNotification = NotificationFactory.create("email", {
        recipient: storeEmail,
        subject: `Your store "${updatedStore.name}" was submitted for review`,
        emailType: "storeOnboarding",
        fromAddress: "noreply@soraxihub.com",
        html: storeOwnerHtml,
        text: storeOwnerText,
        metadata: {
          storeId: updatedStore._id.toString(),
          storeName: updatedStore.name,
          notificationType: "store_onboarding_confirmation",
        },
      });

      await storeOwnerNotification.send();

      console.log(
        `Store submission emails sent successfully for store: ${updatedStore.name}`
      );
    } catch (error) {
      console.error(
        `Failed to send store submission emails (admin notification or store owner confirmation).
     Store ID: ${store.id}, Store Name: ${updatedStore.name}, Store Email: ${store.storeEmail}.
     Error: ${error instanceof Error ? error.message : error}`
      );
      // Don't throw error here - the store was successfully updated, just email failed
    }

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

// import { type NextRequest, NextResponse } from "next/server";
// import { getStoreModel } from "@/lib/db/models/store.model";
// import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
// import { type IStore, type IShippingMethod } from "@/lib/db/models/store.model";
// import {
//   generateAdminNotificationHtml,
//   generateStoreOwnerConfirmationHtml,
//   sendMail,
// } from "@/services/mail.service";
// import {
//   StoreBusinessInfoEnum,
//   StoreStatusEnum,
//   StoreVerificationStatusEnum,
// } from "@/validators/store-validators";

// // ----------- Types for incoming request -----------

// // Store profile section
// interface OnboardingProfile {
//   name: string;
//   description: string;
//   logoUrl?: string;
//   bannerUrl?: string;
// }

// // Business info section
// interface OnboardingBusinessInfo {
//   type: StoreBusinessInfoEnum;
//   businessName?: string;
//   registrationNumber?: string;
//   taxId?: string;
//   documentUrls?: string[];
// }

// // Full onboarding data payload
// interface OnboardingData {
//   profile: OnboardingProfile;
//   "business-info": OnboardingBusinessInfo;
//   shipping: IShippingMethod[];
//   termsAgreed: boolean;
// }

// // Request body format
// interface PostBody {
//   storeId: string;
//   onboardingData: OnboardingData;
//   agreementTimestamp: string;
// }

// /**
//  * API Route: Submit Onboarding for Review
//  * Finalizes the onboarding process and submits store for admin approval
//  * Updates store status and marks onboarding as complete
//  */
// export async function POST(request: NextRequest) {
//   try {
//     if (!process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL) {
//       console.error("Missing required environment variables");
//       throw new Error(
//         "Server configuration error: Missing required SORAXI EMAIL CONFIG environment variables"
//       );
//     }

//     // Check authentication
//     const userData = await getUserDataFromToken(request);
//     if (!userData) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Parse incoming body with expected shape
//     const body: PostBody = await request.json();
//     const { storeId, onboardingData, agreementTimestamp } = body;

//     // console.log("Onboarding submission data:", {
//     //   storeId,
//     //   onboardingData,
//     //   agreementTimestamp,
//     // });

//     // Validate required fields
//     if (!storeId || !onboardingData) {
//       return NextResponse.json(
//         { error: "Store ID and onboarding data are required" },
//         { status: 400 }
//       );
//     }

//     // Get store model and find the store
//     const Store = await getStoreModel();
//     const store = await Store.findById(storeId);

//     if (!store) {
//       return NextResponse.json({ error: "Store not found" }, { status: 404 });
//     }

//     // Verify that the authenticated user owns this store
//     if (store.storeOwner.toString() !== userData.id) {
//       return NextResponse.json(
//         { error: "Unauthorized - not store owner" },
//         { status: 403 }
//       );
//     }

//     // Extract onboarding data sections
//     const { profile, shipping, termsAgreed } = onboardingData;
//     const businessInfo = onboardingData["business-info"];

//     // console.log("businessInfo", businessInfo);

//     // Validate profile info
//     if (!profile?.name || !profile?.description) {
//       return NextResponse.json(
//         { error: "Store profile is incomplete" },
//         { status: 400 }
//       );
//     }

//     // Validate business info
//     if (!businessInfo?.type) {
//       return NextResponse.json(
//         { error: "Business information is incomplete" },
//         { status: 400 }
//       );
//     }

//     if (
//       businessInfo.type === StoreBusinessInfoEnum.Company &&
//       (!businessInfo.businessName || !businessInfo.registrationNumber)
//     ) {
//       return NextResponse.json(
//         { error: "Company registration details are required" },
//         { status: 400 }
//       );
//     }

//     // Validate at least one shipping method
//     if (!shipping || shipping.length === 0) {
//       return NextResponse.json(
//         { error: "At least one shipping method is required" },
//         { status: 400 }
//       );
//     }

//     // Ensure terms were agreed to
//     if (!termsAgreed) {
//       return NextResponse.json(
//         { error: "Terms agreement is required" },
//         { status: 400 }
//       );
//     }

//     /**
//      * Build the data structure to update the store with:
//      * - Store profile
//      * - Business info
//      * - Shipping methods
//      * - Payout setup
//      * - Terms agreement timestamp
//      * - Verification and status for admin review
//      */
//     const updateData: Partial<
//       Pick<
//         IStore,
//         | "name"
//         | "description"
//         | "logoUrl"
//         | "bannerUrl"
//         | "businessInfo"
//         | "shippingMethods"
//         | "payoutAccounts"
//         | "agreedToTermsAt"
//         | "status"
//         | "verification"
//       >
//     > = {
//       // Profile data
//       name: profile.name,
//       description: profile.description,
//       logoUrl: profile.logoUrl || undefined,
//       bannerUrl: profile.bannerUrl || undefined,

//       // Business info
//       businessInfo: {
//         type: businessInfo.type,
//         businessName: businessInfo.businessName,
//         registrationNumber: businessInfo.registrationNumber,
//         taxId: businessInfo.taxId,
//         documentUrls: businessInfo.documentUrls || [],
//       },

//       // Shipping methods
//       shippingMethods: shipping.map((method) => ({
//         name: method.name,
//         price: method.price,
//         estimatedDeliveryDays: method.estimatedDeliveryDays,
//         isActive: true,
//         description: method.description,
//         applicableRegions: method.applicableRegions || [],
//         conditions: method.conditions || {},
//       })),

//       // Terms agreement date
//       agreedToTermsAt: new Date(agreementTimestamp),

//       // Mark store as pending for admin review
//       status: StoreStatusEnum.Pending,

//       // Initial verification setup
//       verification: {
//         isVerified: false, // Will be set to true after admin approval
//         method: StoreVerificationStatusEnum.Email,
//         notes: "Onboarding completed, pending admin review",
//       },
//     };

//     // Save the updated store
//     const updatedStore = await Store.findByIdAndUpdate(storeId, updateData, {
//       new: true,
//     });

//     if (!updatedStore) {
//       return NextResponse.json(
//         { error: "Failed to update store" },
//         { status: 500 }
//       );
//     }

//     try {
//       // Send notification email to admins about new store submission
//       const adminEmail = process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL;
//       const storeEmail = store.storeEmail;

//       // Admin notification
//       await sendMail({
//         email: adminEmail,
//         emailType: "storeOrderNotification",
//         fromAddress: "admin@soraxihub.com",
//         subject: `New Store Submission: ${updatedStore.name}`,
//         html: generateAdminNotificationHtml({
//           storeName: updatedStore.name,
//           ownerEmail: storeEmail,
//           submittedAt: updatedStore.agreedToTermsAt || new Date(),
//         }),
//       });

//       // Send confirmation email to store owner
//       await sendMail({
//         email: storeEmail,
//         emailType: "noreply",
//         fromAddress: "noreply@soraxihub.com",
//         subject: `Your store "${updatedStore.name}" was submitted for review`,
//         html: generateStoreOwnerConfirmationHtml(updatedStore.name, storeEmail),
//       });
//     } catch (error) {
//       console.error(
//         `Failed to send store submission emails (admin notification or store owner confirmation).
//      Store ID: ${store.id}, Store Name: ${updatedStore.name}, Store Email: ${
//           store.storeEmail
//         }.
//      Error: ${error instanceof Error ? error.message : error}`
//       );
//     }

//     // Return success response with summary
//     return NextResponse.json({
//       success: true,
//       message: "Onboarding submitted successfully for review",
//       store: {
//         id: updatedStore._id,
//         name: updatedStore.name,
//         status: updatedStore.status,
//         verification: updatedStore.verification,
//         submittedAt: updatedStore.agreedToTermsAt,
//       },
//     });
//   } catch (error) {
//     console.error("Error submitting onboarding:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
