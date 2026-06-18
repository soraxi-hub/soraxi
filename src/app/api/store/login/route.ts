import { type NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { AuthService } from "@/services/auth.service";
import { CookieService } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeEmail, password } = body;

    if (!storeEmail || !password) {
      throw new AppError(
        "BAD_REQUEST",
        "Store email and password are required",
      );
    }

    const { tokenData, store, onboarding } = await AuthService.storeLogin(
      storeEmail,
      password,
    );

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      tokenData,
      store: {
        id: store.storeId,
        name: store.storeName,
        storeEmail: store.email,
        status: store.status,
        verification: store.verification,
        onboarding: onboarding,
      },
    });

    const hostname = request.nextUrl.hostname;

    await CookieService.setStoreAuth(response, tokenData, hostname);

    return response;
  } catch (error) {
    console.error("Store login error:", error);
    return handleApiError(error);
  }
}
