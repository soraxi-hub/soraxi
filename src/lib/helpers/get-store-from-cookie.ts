"use server";

import { cookies } from "next/headers";
import { CookieService } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { TokenType } from "@/enums";

/**
 * Safely extracts store token data from the "store" cookie.
 * Returns null if the token is missing or invalid.
 */
export async function getStoreFromCookie() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TokenType.Store)?.value;

    if (!token) return null;

    return CookieService.verifyStoreToken(token);
  } catch (err) {
    console.error("Invalid store token:", err);
    return null;
  }
}
