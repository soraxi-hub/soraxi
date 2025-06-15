import { NextResponse } from "next/server";

/**
 * Logs out the store by clearing the "store" cookie.
 * This route can be called from any component to sign out the store.
 */
export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Store logged out successfully",
  });

  response.cookies.set("store", "", {
    httpOnly: true,
    expires: new Date(0), // Immediately expire the cookie
  });

  return response;
}
