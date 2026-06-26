import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth.service";
import { CookieService } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { TokenType } from "@/enums";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { AppError } from "@/lib/errors/app-error";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentPassword, newPassword, ref } = body as {
      currentPassword: string;
      newPassword: string;
      ref: "user" | "store";
    };

    // Basic field presence check
    if (!currentPassword || !newPassword || !ref) {
      throw new AppError("BAD_REQUEST", "Missing required fields", {
        fields: {
          currentPassword: !!currentPassword,
          newPassword: !!newPassword,
          ref: !!ref,
        },
      });
    }

    if (ref !== "user" && ref !== "store") {
      throw new AppError("BAD_REQUEST", "Invalid ref value", { ref });
    }

    // Resolve the token cookie name based on ref
    const tokenName = ref === "user" ? TokenType.User : TokenType.Store;
    const token = req.cookies.get(tokenName)?.value;

    if (!token) {
      throw new AppError("UNAUTHORIZED", "Unauthorized");
    }

    // Verify the token and extract the email
    const payload =
      ref === "user"
        ? await CookieService.verifyUserToken(token)
        : await CookieService.verifyStoreToken(token);

    if (!payload) {
      throw new AppError("UNAUTHORIZED", "Unauthorized");
    }

    const identifierEmail =
      ref === "user"
        ? (payload as Awaited<
            ReturnType<typeof CookieService.verifyUserToken>
          >)!.email
        : (payload as Awaited<
            ReturnType<typeof CookieService.verifyStoreToken>
          >)!.storeEmail;

    // Verify the current password before updating
    await AuthService.verifyCurrentPassword(
      identifierEmail,
      currentPassword,
      ref,
    );

    // Update to the new password
    await AuthService.updatePassword(identifierEmail, newPassword, ref);

    const hostname = req.headers.get("host") ?? "";
    const response = NextResponse.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 },
    );

    // Clear the auth cookie so the client is signed out
    if (ref === "user") {
      CookieService.clearUserAuth(response, hostname);
    } else {
      CookieService.clearStoreAuth(response, hostname);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
