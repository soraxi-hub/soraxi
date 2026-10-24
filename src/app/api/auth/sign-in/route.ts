import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { AuthService } from "@/services/auth.service";
import { CookieService } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import { mergeGuestIntoUser } from "@/services/guest-merge.service";
import { getGuestCookieOptions } from "@/lib/helpers/guest-cookie-options";
import { TokenType } from "@/enums";

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  const { email, password } = requestBody;

  try {
    await connectToDatabase();

    const { tokenPayload } = await AuthService.userLogin(email, password);

    const response = NextResponse.json(
      { message: "Login successful", success: true },
      { status: 200 },
    );

    const hostname = request.nextUrl.hostname;

    await CookieService.setUserAuth(response, tokenPayload, hostname);

    const guestId = request.cookies.get(TokenType.Guest)?.value;
    if (guestId) {
      try {
        await mergeGuestIntoUser(tokenPayload.id, guestId);
        response.cookies.set(
          TokenType.Guest,
          "",
          getGuestCookieOptions(hostname, 0),
        );
      } catch (mergeError) {
        // Never block a successful login over a guest-cart merge failure.
        console.error("Failed to merge guest cart/wishlist:", mergeError);
      }
    }

    return response;
  } catch (error) {
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, { source: "POST /api/auth/sign-in" }),
        );
      } catch {
        // sendTelegramMessage already console.errors internally; never mask the original error
      }
    }
    return handleApiError(error);
  }
}
