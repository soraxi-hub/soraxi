import { NextRequest } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";

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

// import { NextRequest } from "next/server";
// import jwt, { JwtPayload } from "jsonwebtoken";

// // Define what you expect from the token payload
// interface StoreTokenPayload {
//   id: string;
//   name: string;
//   storeEmail: string;
//   status: string;
// }

// // Type guard to ensure token payload matches expected shape
// function isStoreTokenPayload(payload: any): payload is StoreTokenPayload {
//   return (
//     payload &&
//     typeof payload.id === "string" &&
//     typeof payload.name === "string" &&
//     typeof payload.storeEmail === "string" &&
//     typeof payload.status === "string"
//   );
// }

// /**
//  * Retrieves the store's decoded token data from the request cookie
//  * @param request NextRequest object from middleware or server handler
//  * @returns StoreTokenPayload or null
//  */
// export function getStoreDataFromToken(
//   request: NextRequest
// ): StoreTokenPayload | null {
//   try {
//     const encodedToken = request.cookies.get("store")?.value;
//     if (!encodedToken) return null;

//     const decoded = jwt.verify(encodedToken, process.env.JWT_SECRET_KEY!) as
//       | JwtPayload
//       | string;

//     if (typeof decoded === "string") {
//       throw new Error("Token is a string, not an object");
//     }

//     if (!isStoreTokenPayload(decoded)) {
//       throw new Error("Invalid store token payload");
//     }

//     return decoded;
//   } catch (err) {
//     console.error("Error decoding store token:", err);
//     return null;
//   }
// }
