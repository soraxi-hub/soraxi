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
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

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

export async function POST(request: NextRequest) {
  try {
    if (!process.env.SORAXI_ADMIN_NOTIFICATION_EMAIL) {
      // The specific variable is named in the log, never in the thrown message:
      // AppError messages are returned to the caller verbatim, and our
      // deployment configuration is not the vendor's business.
      console.error(
        "Missing required environment variable: SORAXI_ADMIN_NOTIFICATION_EMAIL",
      );
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Store setup is temporarily unavailable. Our team has been notified — please try again shortly.",
      );
    }

    // Check authentication
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      throw new AppError(
        "UNAUTHORIZED",
        "Your session has expired. Sign in again to finish setting up your store.",
      );
    }

    // Parse incoming body with expected shape
    const body: PostBody = await request.json();
    const { storeId, onboardingData, agreementTimestamp } = body;

    // Validate required fields
    if (!storeId || !onboardingData) {
      throw new AppError(
        "BAD_REQUEST",
        "Some of your onboarding details didn't reach us. Go back through the steps and submit again.",
      );
    }

    // Get store model and find the store
    const Store = await getStoreModel();
    const store = await Store.findById(storeId);

    if (!store) {
      throw new AppError(
        "NOT_FOUND",
        "We couldn't find that store. It may have been removed — check your profile for the store you're setting up.",
      );
    }

    // Verify that the authenticated user owns this store
    if (store.storeOwner.toString() !== userData.id) {
      throw new AppError(
        "FORBIDDEN",
        "This store belongs to a different account. Sign in with the account you applied to sell with.",
      );
    }

    // Extract onboarding data sections
    const { profile, shipping, termsAgreed } = onboardingData;

    // Validate profile info
    if (!profile?.name || !profile?.description) {
      throw new AppError(
        "BAD_REQUEST",
        !profile?.name
          ? "Your store needs a name before you can go live. Go back to the Store Profile step."
          : "Your store needs a description before you can go live. Go back to the Store Profile step.",
      );
    }

    // Validate at least one shipping method
    if (!shipping || shipping.length === 0) {
      throw new AppError(
        "BAD_REQUEST",
        "Add at least one delivery method so buyers know how their orders will reach them. Go back to the Shipping step.",
      );
    }

    // Ensure terms were agreed to
    if (!termsAgreed) {
      throw new AppError(
        "BAD_REQUEST",
        "You need to accept the vendor terms before your store can go live. Go back to the Terms step.",
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
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "We couldn't save your store setup. Nothing has been changed — please try submitting again.",
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
    return handleApiError(error);
  }
}
