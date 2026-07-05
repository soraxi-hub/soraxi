import { connectToDatabase } from "@/lib/db/mongoose";
import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/utils/handle-api-error";
import { CookieService } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { AuthService } from "@/services/auth.service";
import { AppError } from "@/lib/errors/app-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

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
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, { source: "POST /api/auth/admin-sign-in" }),
        );
      } catch {
        // sendTelegramMessage already console.errors internally; never mask the original error
      }
    }
    return handleApiError(error);
  }
}
