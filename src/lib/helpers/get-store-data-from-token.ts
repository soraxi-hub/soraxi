import { NextRequest } from "next/server";
import {
  CookieService,
  TokenType,
} from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";

/**
 * Extracts store token data from the request cookies.
 * @param request - Next.js API or middleware request object.
 * @returns Decoded store payload or null if invalid.
 */
export async function getStoreDataFromToken(request: NextRequest) {
  try {
    const encodedToken: string | undefined = request.cookies.get(
      TokenType.Store,
    )?.value;
    if (!encodedToken) return null;

    return await CookieService.verifyStoreToken(encodedToken);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error decoding store token:", error.message);
    return null;
  }
}
