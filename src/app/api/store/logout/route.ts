import { CookieService } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { NextRequest, NextResponse } from "next/server";

/**
 * Logs out the store by clearing the "store" cookie.
 * This route can be called from any component to sign out the store.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });
  const hostname = request.nextUrl.hostname;
  CookieService.clearStoreAuth(response, hostname);
  return response;
}
