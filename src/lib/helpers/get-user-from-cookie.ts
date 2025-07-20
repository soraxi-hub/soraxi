"use server";

import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export interface TokenData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  store?: string; // Optional store field
}

/**
 * Safely extracts user token data from the "user" cookie.
 * Returns null if the token is missing or invalid.
 */
export async function getUserFromCookie(): Promise<TokenData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("user")?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as TokenData;

    const isValid =
      typeof decoded.id === "string" &&
      typeof decoded.firstName === "string" &&
      typeof decoded.lastName === "string" &&
      typeof decoded.email === "string" &&
      (decoded.store === undefined || typeof decoded.store === "string");

    return isValid ? decoded : null;
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
}
