"use server";

import { cookies } from "next/headers";
import {
  CookieService,
  TokenType,
} from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";

/**
 * Safely extracts admin token data from the "adminToken" cookie.
 * Returns null if the token is missing or invalid.
 */
export async function getAdminFromCookie() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TokenType.Admin)?.value;

    if (!token) return null;

    return CookieService.verifyAdminToken(token);
  } catch (err) {
    console.error("Invalid admin token:", err);
    return null;
  }
}
