import { type NextRequest, NextResponse } from "next/server";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/utils/handle-api-error";
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

/**
 * API Route: Create New Store
 * Creates a new store with pending status for the authenticated user
 * Generates unique store ID and hashes password for security
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.JWT_SECRET_KEY) {
      console.error("Missing required environment variables");
      throw new AppError(
        "Server configuration error: Missing required JWT environment variables",
        500,
      );
    }

    await connectToDatabase();
    // Check authentication - user must be logged in to create a store
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      throw new AppError("Unauthorized - Please sign in first", 401);
    }

    const body = await request.json();
    const { storeName, storeEmail, password } = body;

    // Validate required fields
    if (!storeName || !storeEmail || !password) {
      throw new AppError("Store name, email, and password are required", 400);
    }

    const storeNameRes = storeNameSchema.safeParse(storeName);

    // Validate store name format
    if (!storeNameRes.success) {
      throw new AppError(
        storeNameRes.error.errors[0].message ||
          `Store name can only contain letters, numbers, spaces, hyphens, and underscores`,
        400,
      );
    }

    const storeEmailRes = storeEmailSchema.safeParse(storeEmail);

    // Validate email format
    if (!storeEmailRes.success) {
      throw new AppError(
        storeEmailRes.error.errors[0].message ||
          "Please enter a valid email address",
        400,
      );
    }

    const storePasswordres = storePasswordSchema.safeParse(password);

    // Validate password strength
    if (!storePasswordres.success) {
      throw new AppError(
        storePasswordres.error.errors[0].message ||
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        400,
      );
    }

    const savedStore = await StoreService.createStore({
      storeName,
      storeEmail,
      password,
      ownerId: userData.id,
    });

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

    // Return success response with store information
    return response;
  } catch (error) {
    console.error("Error creating store:", error);

    return handleApiError(error);
  }
}
