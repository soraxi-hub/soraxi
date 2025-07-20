import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Logs out the store by clearing the "store" cookie.
 * This route can be called from any component to sign out the store.
 */
export async function POST() {
  const cookieStore = await cookies();

  // Remove cookies
  cookieStore.delete("store");

  return NextResponse.json({
    success: true,
    message: "Store logged out successfully",
  });
}
