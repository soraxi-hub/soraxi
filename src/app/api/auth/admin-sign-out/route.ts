import { CookieService } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });
  const hostname = request.nextUrl.hostname;
  CookieService.clearAminAuth(response, hostname);
  return response;
}
