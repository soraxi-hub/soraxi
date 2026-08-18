import { type NextRequest, NextResponse } from "next/server";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getUserModel } from "@/lib/db/models/user.model";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { type IStore, type IShippingMethod } from "@/lib/db/models/store.model";
import {
  StoreBusinessInfoEnum,
  StoreStatusEnum,
  StoreVerificationStatusEnum,
} from "@/enums";
import {
  AdminNotificationEmail,
  NotificationFactory,
  renderTemplate,
  StoreOnboardingEmail,
} from "@/domain/notification";
import React from "react";
import { EmailTextTemplates } from "@/lib/utils/email-text-templates";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

// ----------- Types for incoming request -----------

// Store profile section
interface OnboardingProfile {
  name: string;
  description: string;
}

// Full onboarding data payload
interface OnboardingData {
  profile: OnboardingProfile;
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
 * API Route: Complete Onboarding
 *
 * Finalizes onboarding and takes the store live immediately.
 *
 * There is deliberately no second review here. The vendor was already vetted at
 * the waitlist stage — product samples, category, and proof of business were all
 * reviewed before their store was created. Onboarding adds a description, a
 * shipping price, and a terms timestamp, none of which a reviewer can act on, so
 * a second approval queue only kept a vetted vendor waiting. Admins retain
 * suspend and moderation powers over a live store.
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL) {
      console.error("Missing required environment variables");
      throw new Error(
        "Server configuration error: Missing required SORAXI EMAIL CONFIG environment variables",
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
        { status: 400 },
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
        { status: 403 },
      );
    }

    // Extract onboarding data sections
    const { profile, shipping, termsAgreed } = onboardingData;

    // Validate profile info
    if (!profile?.name || !profile?.description) {
      return NextResponse.json(
        { error: "Store profile is incomplete" },
        { status: 400 },
      );
    }

    // Validate at least one shipping method
    if (!shipping || shipping.length === 0) {
      return NextResponse.json(
        { error: "At least one shipping method is required" },
        { status: 400 },
      );
    }

    // Ensure terms were agreed to
    if (!termsAgreed) {
      return NextResponse.json(
        { error: "Terms agreement is required" },
        { status: 400 },
      );
    }

    /**
     * Build the data structure to update the store with:
     * - Store profile
     * - Business type (defaulted — no longer asked for)
     * - Shipping methods
     * - Terms agreement timestamp
     * - Active status, since onboarding no longer gates on a second review
     */
    const updateData: Partial<
      Pick<
        IStore,
        | "name"
        | "description"
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

      // Business info. Onboarding used to ask for this on its own screen, where
      // the only selectable option was "Individual Seller" — so it is defaulted
      // here rather than collected.
      businessInfo: {
        type: StoreBusinessInfoEnum.Individual,
        documentUrls: [],
      },

      // Shipping methods
      shippingMethods: shipping.map((method) => ({
        name: method.name,
        price: method.price,
        estimatedDeliveryDays: method.estimatedDeliveryDays,
        isActive: true,
        description: method.description,
      })),

      // Terms agreement date
      agreedToTermsAt: new Date(agreementTimestamp),

      // Live immediately — the vendor was vetted at the waitlist stage.
      status: StoreStatusEnum.Active,

      verification: {
        isVerified: true,
        method: StoreVerificationStatusEnum.Email,
        notes: "Onboarding completed; approved at the waitlist stage",
      },
    };

    // Save the updated store
    const updatedStore = await Store.findByIdAndUpdate(storeId, updateData, {
      new: true,
    });

    if (!updatedStore) {
      return NextResponse.json(
        { error: "Failed to update store" },
        { status: 500 },
      );
    }

    try {
      // Send notification email to admins about new store submission
      const adminEmail = process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL;
      const storeEmail = store.storeEmail;

      // Get store owner name properly
      const storeOwnerName = await getStoreOwnerName(
        store.storeOwner.toString(),
      );

      // 1. Notify admins — informational only. Nothing is queued for approval;
      // this exists so the team can see new storefronts going live.
      const adminHtml = await renderTemplate(
        React.createElement(AdminNotificationEmail, {
          title: "New Store Live",
          content: `"${updatedStore.name}" finished onboarding and is now live. No review is required — this vendor was approved at the waitlist stage.`,
          details: {
            "Store Name": updatedStore.name,
            "Store Owner": storeOwnerName,
            "Owner Email": storeEmail,
            "Went Live": new Date().toLocaleDateString(),
            "Store ID": updatedStore._id.toString(),
          },
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/stores/${updatedStore._id}`,
          actionLabel: "View Store",
        }),
      );

      const adminText = EmailTextTemplates.generateAdminNotificationText({
        storeName: updatedStore.name,
        storeOwnerName,
        storeEmail,
        businessType: StoreBusinessInfoEnum.Individual,
        storeId: updatedStore._id.toString(),
      });

      const adminNotification = NotificationFactory.create("email", {
        recipient: adminEmail,
        subject: `New Store Live: ${updatedStore.name}`,
        emailType: "admin",
        fromAddress: "admin@soraxihub.com",
        html: adminHtml,
        text: adminText,
        // metadata: {
        //   storeId: updatedStore._id.toString(),
        //   storeName: updatedStore.name,
        //   notificationType: "store_submission",
        // },
      });

      await adminNotification.send();

      // 2. Send confirmation email to store owner using StoreOnboardingEmail template
      const storeOwnerHtml = await renderTemplate(
        React.createElement(StoreOnboardingEmail, {
          ownerName: storeOwnerName,
          storeName: updatedStore.name,
        }),
      );

      const storeOwnerText = EmailTextTemplates.generateStoreOnboardingText({
        ownerName: storeOwnerName,
        storeName: updatedStore.name,
      });

      const storeOwnerNotification = NotificationFactory.create("email", {
        recipient: storeEmail,
        subject: `Your store "${updatedStore.name}" is live`,
        emailType: "storeOnboarding",
        fromAddress: "noreply@soraxihub.com",
        html: storeOwnerHtml,
        text: storeOwnerText,
      });

      await storeOwnerNotification.send();

      console.log(
        `Store go-live emails sent successfully for store: ${updatedStore.name}`,
      );
    } catch (error) {
      console.error(
        `Failed to send store submission emails (admin notification or store owner confirmation).
     Store ID: ${store.id}, Store Name: ${updatedStore.name}, Store Email: ${store.storeEmail}.
     Error: ${error instanceof Error ? error.message : error}`,
      );
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, {
              source: "service:store-onboarding-submit.notifyEmails",
            }),
          );
        } catch {
          // sendTelegramMessage already console.errors internally; never mask the original error
        }
      }
      // Don't throw error here - the store was successfully updated, just email failed
    }

    // Return success response with summary
    return NextResponse.json({
      success: true,
      message: "Onboarding complete — your store is live",
      store: {
        id: updatedStore._id,
        name: updatedStore.name,
        status: updatedStore.status,
        verification: updatedStore.verification,
        completedAt: updatedStore.agreedToTermsAt,
      },
    });
  } catch (error) {
    console.error("Error submitting onboarding:", error);
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, {
            source: "POST /api/store/onboarding/submit",
          }),
        );
      } catch {
        // sendTelegramMessage already console.errors internally; never mask the original error
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
