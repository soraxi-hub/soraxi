"use client";

import { useEffect } from "react";

/**
 * Fires once on mount so a logged-out visitor has a guest-id cookie before
 * they try to add anything to cart/wishlist. The endpoint is idempotent (it
 * no-ops if a cookie already exists, or if the visitor is logged in), so
 * calling it on every page load is cheap and safe.
 */
export function GuestSessionBootstrap() {
  useEffect(() => {
    fetch("/api/guest/ensure", { method: "POST" }).catch(() => {
      // Best-effort — a failed guest-id issuance just means the visitor is
      // prompted to log in on their first add-to-cart/wishlist attempt.
    });
  }, []);

  return null;
}
