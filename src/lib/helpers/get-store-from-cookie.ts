"use server";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export interface StoreTokenData {
  id: string;
  name: string;
  storeEmail: string;
  status: string;
}

/**
 * Safely extracts store token data from the "store" cookie.
 * Returns null if the token is missing or invalid.
 */
export async function getStoreFromCookie(): Promise<StoreTokenData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("store")?.value;

    if (!token) return null;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_KEY!
    ) as StoreTokenData;

    const isValid =
      typeof decoded.id === "string" &&
      typeof decoded.name === "string" &&
      typeof decoded.storeEmail === "string" &&
      typeof decoded.status === "string";

    return isValid ? decoded : null;
  } catch (err) {
    console.error("Invalid store token:", err);
    return null;
  }
}
