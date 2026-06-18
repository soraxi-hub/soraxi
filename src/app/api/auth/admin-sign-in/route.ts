import { connectToDatabase } from "@/lib/db/mongoose";
import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/utils/handle-api-error";
import { CookieService } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { AuthService } from "@/services/auth.service";
import { AppError } from "@/lib/errors/app-error";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { email, password } = requestBody;

    // Validate input
    if (!email || !password) {
      throw new AppError("BAD_REQUEST", "Email and password are required");
    }

    // Connect to database
    await connectToDatabase();

    const { admin, tokenPayload } = await AuthService.adminLogin(
      email,
      password,
    );

    const response = NextResponse.json(
      {
        message: "Login successful",
        success: true,
        admin: {
          id: admin.adminId,
          name: admin.name,
          email: admin.email,
          roles: admin.roles,
        },
      },
      { status: 200 },
    );

    const hostname = request.nextUrl.hostname;

    await CookieService.setAdminAuth(response, tokenPayload, hostname);

    return response;
  } catch (error) {
    console.error("Admin sign-in error:", error);
    return handleApiError(error);
  }
}
