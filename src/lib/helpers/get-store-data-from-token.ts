import { NextRequest } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AppError } from "../errors/app-error";

/**
 * Expected shape of the store's JWT token payload.
 */
export interface StoreTokenPayload {
  id: string;
  name: string;
  storeEmail: string;
  status: string;
}

/**
 * Type guard to ensure the decoded JWT matches StoreTokenPayload.
 */
function isStoreTokenPayload(payload: unknown): payload is StoreTokenPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as StoreTokenPayload).id === "string" &&
    typeof (payload as StoreTokenPayload).name === "string" &&
    typeof (payload as StoreTokenPayload).storeEmail === "string" &&
    typeof (payload as StoreTokenPayload).status === "string"
  );
}

/**
 * Extracts store token data from the request cookies.
 * @param request - Next.js API or middleware request object.
 * @returns Decoded store payload or null if invalid.
 */
export function getStoreDataFromToken(
  request: NextRequest
): StoreTokenPayload | null {
  try {
    if (!process.env.JWT_SECRET_KEY) {
      console.error("Missing required environment variables");
      throw new AppError(
        "Server configuration error: Missing required JWT environment variables",
        500
      );
    }

    const encodedToken: string | undefined =
      request.cookies.get("store")?.value;
    if (!encodedToken) return null;

    const decoded = jwt.verify(
      encodedToken,
      process.env.JWT_SECRET_KEY as string
    ) as JwtPayload | string;

    if (typeof decoded === "string") {
      throw new Error("Token is a string, not an object");
    }

    if (!isStoreTokenPayload(decoded)) {
      throw new Error("Invalid store token payload");
    }

    return decoded;
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error decoding store token:", error.message);
    return null;
  }
}
