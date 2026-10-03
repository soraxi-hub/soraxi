import { type NextRequest, NextResponse } from "next/server";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import {
  storeName as storeNameSchema,
  storeEmail as storeEmailSchema,
  storePassword as storePasswordSchema,
} from "@/validators/store-validators";
import { StoreService } from "@/services/store/store.service";
import {
  CookieService,
  StoreTokenPayload,
  UserTokenPayload,
} from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import mongoose from "mongoose";
import { VendorApplicationRepository } from "@/repositories/vendor-application-repository";
import { PasswordService } from "@/lib/utils";

const vendorApplicationRepository = new VendorApplicationRepository();

/**
 * Validates a waitlist invite token against the application it was issued
 * for. Shared by GET (prefill) and POST (actual store creation).
 */
async function resolveInvite(applicationId: string, token: string) {
  const application = await vendorApplicationRepository.findById(applicationId);

  if (
    !application ||
    !application.isInvited() ||
    !application.inviteToken ||
    !application.inviteExpiresAt ||
    application.inviteExpiresAt.getTime() < Date.now()
  ) {
    return null;
  }

  const isMatch = await PasswordService.validatePassword(
    token,
    application.inviteToken,
  );

  return isMatch ? application : null;
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const token = searchParams.get("token");
    const applicationId = searchParams.get("applicationId");

    if (!token || !applicationId) {
      throw new AppError("BAD_REQUEST", "Invite token and applicationId are required");
    }

    const application = await resolveInvite(applicationId, token);

    if (!application) {
      throw new AppError(
        "UNAUTHORIZED",
        "This invite link is invalid or has expired",
      );
    }

    return NextResponse.json({
      businessName: application.businessName,
      email: application.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!process.env.JWT_SECRET_KEY) {
      console.error("Missing required environment variables");
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Server configuration error: Missing required JWT environment variables",
      );
    }

    await connectToDatabase();
    // Check authentication - user must be logged in to create a store
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      throw new AppError("UNAUTHORIZED", "Please sign in");
    }

    const body = await request.json();
    const { storeName, storeEmail, password, token, applicationId } = body;

    // Validate required fields
    if (!token || !applicationId) {
      throw new AppError("BAD_REQUEST", "Invitation token is required");
    }

    // Validate required fields
    if (!storeName || !storeEmail || !password) {
      throw new AppError(
        "BAD_REQUEST",
        "Store name, email, and password are required",
      );
    }

    const application = await resolveInvite(applicationId, token);

    if (!application) {
      throw new AppError(
        "UNAUTHORIZED",
        "This invite link is invalid or has expired",
      );
    }

    if (application.submittedBy !== userData.id) {
      throw new AppError(
        "UNAUTHORIZED",
        "This invite link does not belong to the signed-in account",
      );
    }

    const storeNameRes = storeNameSchema.safeParse(storeName);

    // Validate store name format
    if (!storeNameRes.success) {
      throw new AppError(
        "BAD_REQUEST",
        storeNameRes.error.errors[0].message ??
          `Store name can only contain letters, numbers, spaces, hyphens, and underscores`,
      );
    }

    const storeEmailRes = storeEmailSchema.safeParse(storeEmail);

    // Validate email format
    if (!storeEmailRes.success) {
      throw new AppError(
        "BAD_REQUEST",
        storeEmailRes.error.errors[0].message ??
          "Please enter a valid email address",
      );
    }

    const storePasswordres = storePasswordSchema.safeParse(password);

    // Validate password strength
    if (!storePasswordres.success) {
      throw new AppError(
        "BAD_REQUEST",
        storePasswordres.error.errors[0].message ??
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      );
    }

    const savedStore = await StoreService.createStore(
      {
        storeName,
        storeEmail,
        password,
        ownerId: userData.id,
      },
      session,
    );

    // Build token payload
    const storePayload: StoreTokenPayload = {
      id: savedStore._id.toString(),
      name: savedStore.name,
      storeEmail: savedStore.storeEmail,
      status: savedStore.status,
    };

    // Optional: reissue userToken with storeId
    const userPayload: UserTokenPayload = {
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      store: savedStore._id.toString(),
    };

    const response = NextResponse.json(
      {
        success: true,
        message: "Store created successfully",
        store: {
          id: savedStore._id,
          name: savedStore.name,
          storeEmail: savedStore.storeEmail,
          uniqueId: savedStore.uniqueId,
          status: savedStore.status,
          verification: savedStore.verification,
          createdAt: savedStore.createdAt,
        },
      },
      { status: 201 },
    );

    const hostname = request.nextUrl.hostname;

    await CookieService.setStoreAuth(response, storePayload, hostname);

    await CookieService.setUserAuth(response, userPayload, hostname);

    await session.commitTransaction();
    session.endSession();

    // Return success response with store information
    return response;
  } catch (error) {
    console.error("Error creating store:", error);
    await session.abortTransaction();
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, { source: "POST /api/store/create" }),
        );
      } catch {
        // sendTelegramMessage already console.errors internally; never mask the original error
      }
    }
    return handleApiError(error);
  } finally {
    session.endSession();
  }
}
