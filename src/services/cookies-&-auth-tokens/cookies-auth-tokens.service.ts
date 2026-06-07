import { NextResponse } from "next/server";
import * as jose from "jose";
import { AppError } from "@/lib/errors/app-error";
import { IStore } from "@/lib/db/models/store.model";
import { IAdmin } from "@/lib/db/models/admin.model";
import { AuthUserDecorator } from "@/domain/users/decorators/auth-user.decorator";
import { TokenType } from "@/enums";

export interface UserTokenPayload {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  store?: string;
}

export interface StoreTokenPayload {
  id: string;
  name: string;
  storeEmail: string;
  status: string;
}

export interface AdminTokenPayload {
  id: string;
  name: string;
  email: string;
  roles: string[]; // Change to string[] since we're storing roles as strings in the JWT
  isActive: boolean;
}

type CookieOptionsParams = {
  hostname: string;
  maxAge: number;
  sameSite?: "lax" | "strict";
};

export class CookieService {
  // -------------------------
  // INTERNAL HELPERS
  // -------------------------
  private static get jwtSecretKey(): string {
    if (!process.env.JWT_SECRET_KEY) {
      throw new AppError(
        "Server configuration error: Missing required JWT secret",
        500,
      );
    }

    return process.env.JWT_SECRET_KEY;
  }

  private static get secret(): Uint8Array {
    return new TextEncoder().encode(CookieService.jwtSecretKey);
  }

  private static getCookieOptions({
    hostname,
    maxAge,
    sameSite = "lax",
  }: CookieOptionsParams) {
    return {
      httpOnly: true,
      maxAge,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite,
      domain: hostname.endsWith("soraxihub.com") ? ".soraxihub.com" : undefined,
    } as const;
  }

  // -------------------------
  // USER AUTH
  // -------------------------
  static async setUserAuth(
    response: NextResponse,
    payload: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      store?: string;
    },
    hostname: string,
  ) {
    const twoWeeks = 2 * 7 * 24 * 60 * 60;

    const token = await new jose.SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${twoWeeks}s`)
      .sign(CookieService.secret);

    response.cookies.set(
      TokenType.User,
      token,
      this.getCookieOptions({
        hostname,
        maxAge: twoWeeks,
      }),
    );
  }

  // -------------------------
  // STORE AUTH
  // -------------------------
  static async setStoreAuth(
    response: NextResponse,
    payload: {
      id: string;
      name: string;
      storeEmail: string;
      status: string;
    },
    hostname: string,
  ) {
    const oneWeek = 7 * 24 * 60 * 60;

    const token = await new jose.SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${oneWeek}s`)
      .sign(CookieService.secret);

    response.cookies.set(
      TokenType.Store,
      token,
      this.getCookieOptions({
        hostname,
        maxAge: oneWeek,
      }),
    );
  }

  // -------------------------
  // ADMIN AUTH (JOSE)
  // -------------------------
  static async setAdminAuth(
    response: NextResponse,
    payload: {
      id: string;
      name: string;
      email: string;
      roles: string[];
      isActive: boolean;
    },
    hostname: string,
  ) {
    const threeDays = 3 * 24 * 60 * 60;

    const token = await new jose.SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${threeDays}s`)
      .sign(CookieService.secret);

    response.cookies.set(
      TokenType.Admin,
      token,
      this.getCookieOptions({
        hostname,
        maxAge: threeDays,
        sameSite: "strict",
      }),
    );
  }

  static generateUserToken(user: AuthUserDecorator): UserTokenPayload {
    return {
      id: user.userId!,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      store: user.ownedStores[0],
    };
  }

  static generateStoreToken(store: IStore): StoreTokenPayload {
    return {
      id: store._id.toString(),
      name: store.name,
      storeEmail: store.storeEmail,
      status: store.status,
    };
  }

  static generateAdminToken(admin: IAdmin): AdminTokenPayload {
    return {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      roles: admin.roles.map((role) => String(role)),
      isActive: admin.isActive,
    };
  }

  // -------------------------
  // VERIFICATIONS
  // -------------------------
  static async verifyUserToken(
    token: string,
  ): Promise<UserTokenPayload | null> {
    try {
      const { payload } = await jose.jwtVerify(token, CookieService.secret);

      // Ensure that the payload contains the expected fields
      if (
        typeof payload.id !== "string" ||
        typeof payload.firstName !== "string" ||
        typeof payload.lastName !== "string" ||
        typeof payload.email !== "string" ||
        (payload.store !== undefined && typeof payload.store !== "string")
      ) {
        console.error("Invalid token payload structure");
        return null;
      }

      // Convert roles back to Role type if needed
      return {
        id: payload.id,
        firstName: payload.firstName as string,
        lastName: payload.lastName as string,
        email: payload.email as string,
        store: payload.store as string | undefined,
      };
    } catch (error) {
      console.error("Error verifying admin token:", error);
      return null;
    }
  }

  static async verifyStoreToken(
    token: string,
  ): Promise<StoreTokenPayload | null> {
    try {
      const { payload } = await jose.jwtVerify(token, CookieService.secret);

      // Ensure that the payload contains the expected fields
      if (
        typeof payload.id !== "string" ||
        typeof payload.name !== "string" ||
        typeof payload.storeEmail !== "string" ||
        typeof payload.status !== "string"
      ) {
        console.error("Invalid token payload structure");
        return null;
      }

      // Convert roles back to Role type if needed
      return {
        id: payload.id,
        name: payload.name as string,
        storeEmail: payload.storeEmail as string,
        status: payload.status as string,
      };
    } catch (error) {
      console.error("Error verifying admin token:", error);
      return null;
    }
  }

  static async verifyAdminToken(
    token: string,
  ): Promise<AdminTokenPayload | null> {
    try {
      const { payload } = await jose.jwtVerify(token, CookieService.secret);

      // Ensure that the payload contains the expected fields
      if (
        typeof payload.id !== "string" ||
        !Array.isArray(payload.roles) ||
        typeof payload.isActive !== "boolean"
      ) {
        return null;
      }

      // Convert roles back to Role type if needed
      return {
        id: payload.id,
        name: payload.name as string,
        email: payload.email as string,
        roles: payload.roles as string[],
        isActive: payload.isActive as boolean,
      };
    } catch (error) {
      console.error("Error verifying admin token:", error);
      return null;
    }
  }

  // -------------------------
  // CLEAR AUTH
  // -------------------------
  static clearAuth(response: NextResponse, hostname: string) {
    CookieService.clearUserAuth(response, hostname);
    CookieService.clearStoreAuth(response, hostname);
    CookieService.clearAminAuth(response, hostname);
  }

  static clearUserAuth(response: NextResponse, hostname: string) {
    response.cookies.set(
      TokenType.User,
      "",
      this.getCookieOptions({
        hostname,
        maxAge: 0,
      }),
    );
  }

  static clearStoreAuth(response: NextResponse, hostname: string) {
    response.cookies.set(
      TokenType.Store,
      "",
      this.getCookieOptions({
        hostname,
        maxAge: 0,
      }),
    );
  }

  static clearAminAuth(response: NextResponse, hostname: string) {
    response.cookies.set(
      TokenType.Admin,
      "",
      this.getCookieOptions({
        hostname,
        maxAge: 0,
        sameSite: "strict",
      }),
    );
  }
}
