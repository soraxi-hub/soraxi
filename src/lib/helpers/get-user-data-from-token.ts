import { NextRequest } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";

/**
 * Define the shape of the JWT token payload.
 */
export interface TokenData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  store?: string;
}

/**
 * Type guard to ensure the decoded token has the expected structure.
 */
function isTokenData(payload: unknown): payload is TokenData {
  return (
    (typeof payload === "object" &&
      payload !== null &&
      typeof (payload as TokenData).id === "string" &&
      typeof (payload as TokenData).firstName === "string" &&
      typeof (payload as TokenData).lastName === "string" &&
      typeof (payload as TokenData).email === "string" &&
      (payload as TokenData).store === undefined) ||
    typeof (payload as TokenData).store === "string"
  );
}

/**
 * Extracts and verifies user token data from the request cookies.
 * @param request - The Next.js request object
 * @returns TokenData if valid, otherwise null
 */
export const getUserDataFromToken = (
  request: NextRequest
): TokenData | null => {
  try {
    const encodedToken: string = request.cookies.get("user")?.value || "";

    if (!encodedToken) throw new Error("No token found");

    if (!process.env.JWT_SECRET_KEY) {
      console.error("Missing required environment variables");
      throw new Error(
        "Server configuration error: Missing required JWT environment variables"
      );
    }

    const decodedToken = jwt.verify(
      encodedToken,
      process.env.JWT_SECRET_KEY as string
    ) as JwtPayload | string;

    if (typeof decodedToken === "string") {
      throw new Error("Unexpected string token");
    }

    if (isTokenData(decodedToken)) {
      return decodedToken;
    } else {
      throw new Error("Invalid token payload structure");
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error getting user data from token:", err.message);
    return null;
  }
};
