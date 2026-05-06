import { NextRequest } from "next/server";
import {
  CookieService,
  TokenType,
} from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";

/**
 * Extracts and verifies user token data from the request cookies.
 * @param request - The Next.js request object
 * @returns TokenData if valid, otherwise null
 */
export async function getUserDataFromToken(request: NextRequest) {
  try {
    const encodedToken: string | undefined = request.cookies.get(
      TokenType.User,
    )?.value;

    if (!encodedToken) throw new Error("No token found");

    return await CookieService.verifyUserToken(encodedToken);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error getting user data from token:", err.message);
    return null;
  }
}
