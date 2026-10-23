"use server";

import { cookies } from "next/headers";
import { TokenType } from "@/enums";

/**
 * Reads the anonymous guest-id cookie, if present.
 *
 * Unlike the user/store/admin cookies, this is a plain opaque string, not a
 * signed JWT — it is only ever used as a lookup key for a GuestCart/
 * GuestWishlist document, never as a privilege or trust boundary.
 */
export async function getGuestIdFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(TokenType.Guest)?.value ?? null;
  } catch (err) {
    console.error("Invalid guest cookie:", err);
    return null;
  }
}
