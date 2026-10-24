/**
 * Shared cookie-option builder for the guest-id cookie, so the options used
 * to set it (in /api/guest/ensure) and to clear it (after a guest's cart/
 * wishlist is merged on sign-in/sign-up) never drift apart.
 */
export function getGuestCookieOptions(hostname: string, maxAge: number) {
  return {
    httpOnly: true,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    domain: hostname.endsWith("soraxihub.com") ? ".soraxihub.com" : undefined,
  };
}
