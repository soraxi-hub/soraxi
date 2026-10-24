import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateUniqueId } from "@/lib/utils/order-number";
import { getGuestCookieOptions } from "@/lib/helpers/guest-cookie-options";
import { TokenType } from "@/enums";

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

/**
 * Ensures a logged-out visitor has an anonymous guest-id cookie, so a guest
 * cart/wishlist can be created against it. No-ops for an already-logged-in
 * visitor (they never need a guest id) and for a visitor who already has one
 * (the id is never rotated once issued).
 *
 * This is the only place the guest cookie is ever written — cookie writes in
 * this codebase happen only inside Route Handlers, never server components.
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  if (cookieStore.get(TokenType.User)?.value) {
    return NextResponse.json({ guestId: null });
  }

  const existingGuestId = cookieStore.get(TokenType.Guest)?.value;
  if (existingGuestId) {
    return NextResponse.json({ guestId: existingGuestId });
  }

  const guestId = `GST-${generateUniqueId(16).toUpperCase()}`;
  const hostname = request.nextUrl.hostname;

  const response = NextResponse.json({ guestId });
  response.cookies.set(
    TokenType.Guest,
    guestId,
    getGuestCookieOptions(hostname, THIRTY_DAYS_SECONDS),
  );

  return response;
}
