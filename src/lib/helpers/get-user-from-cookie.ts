"use server";

import { cookies } from "next/headers";
import {
  CookieService,
  TokenType,
} from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";

/**
 * Safely extracts user token data from the "user" cookie.
 * Returns null if the token is missing or invalid.
 */
export async function getUserFromCookie() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TokenType.User)?.value;

    if (!token) return null;

    return CookieService.verifyUserToken(token);
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
}
