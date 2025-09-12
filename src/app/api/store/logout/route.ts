import { NextRequest, NextResponse } from "next/server";

/**
 * Logs out the store by clearing the "store" cookie.
 * This route can be called from any component to sign out the store.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });

  const hostname = request.nextUrl.hostname;

  response.cookies.set("store", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: hostname.endsWith("soraxihub.com") ? ".soraxihub.com" : undefined,
  });

  return response;
}
