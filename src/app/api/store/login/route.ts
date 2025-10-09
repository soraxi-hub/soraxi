import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

// Define token data interface
interface StoreTokenPayload {
  id: string;
  name: string;
  storeEmail: string;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.JWT_SECRET_KEY) {
      console.error("Missing required environment variables");
      throw new AppError(
        "Server configuration error: Missing required JWT environment variables",
        500
      );
    }
    const body = await request.json();
    const { storeEmail, password } = body;

    if (!storeEmail || !password) {
      throw new AppError("Store email and password are required", 400);
    }

    const Store = await getStoreModel();
    const store = (await Store.findOne({
      storeEmail: storeEmail.toLowerCase().trim(),
    }).select(
      "name storeEmail password status verification businessInfo shippingMethods payoutAccounts agreedToTermsAt description logoUrl bannerUrl"
    )) as (IStore & { _id: string }) | null;

    if (!store)
      throw new AppError("Store not found", 404, "not_found", "StoreNotFound");

    const isPasswordValid = await bcrypt.compare(password, store.password);
    if (!isPasswordValid) throw new AppError("Invalid credentials", 401);

    // Build token payload
    const tokenData: StoreTokenPayload = {
      id: store._id.toString(),
      name: store.name,
      storeEmail: store.storeEmail,
      status: store.status,
    };

    // One Week in seconds
    const oneWeekInSeconds = 7 * 24 * 60 * 60;

    // Sign JWT
    const token = jwt.sign(tokenData, process.env.JWT_SECRET_KEY, {
      expiresIn: oneWeekInSeconds,
    });

    // Calculate onboarding status
    const onboardingStatus = {
      profileComplete: !!(store.name && store.description),
      businessInfoComplete: !!(
        store.businessInfo &&
        (store.businessInfo.type === "individual" ||
          (store.businessInfo.type === "company" &&
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

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      tokenData, // optional, if frontend needs access to token info
      store: {
        id: store._id.toString(),
        name: store.name,
        storeEmail: store.storeEmail,
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

    const hostname = request.nextUrl.hostname;

    // Set the token in an HTTP-only cookie
    response.cookies.set("store", token, {
      httpOnly: true,
      maxAge: oneWeekInSeconds,
      path: "/", // optional
      secure: process.env.NODE_ENV === "production", // secure only in production
      sameSite: "lax",
      domain: hostname.endsWith("soraxihub.com") ? ".soraxihub.com" : undefined,
    });

    return response;
  } catch (error) {
    console.error("Store login error:", error);
    return handleApiError(error);
  }
}
