import { connectToDatabase } from "@/lib/db/mongoose";
import { type NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import * as jose from "jose";
import type { Role } from "@/modules/admin/security/roles";
import { logAdminAction } from "@/modules/admin/security/audit-logger";
import { getAdminByEmail, IAdmin } from "@/lib/db/models/admin.model";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

interface AdminTokenData {
  id: string;
  name: string;
  email: string;
  roles: Role[] | string[]; // Ensure roles are strings
  isActive: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { email, password } = requestBody;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find the admin by email
    const admin = (await getAdminByEmail(email)) as
      | (IAdmin & { _id: string })
      | null;

    if (!admin) {
      throw new AppError("Invalid credentials", 401);
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw new AppError(
        "Your account has been deactivated. Please contact the system administrator.",
        401
      );
    }

    // Verify the password
    const isPasswordValid = await bcryptjs.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    // Create tokenData - ensure it's a plain object with serializable values
    const adminTokenData: AdminTokenData = {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      roles: admin.roles as string[],
      isActive: admin.isActive,
    };

    // One Day in seconds
    const oneDayInSeconds = 24 * 60 * 60;

    // Check if JWT_SECRET_KEY exists
    if (!process.env.JWT_SECRET_KEY) {
      console.error("JWT_SECRET_KEY is not defined");
      throw new AppError("Internal server error", 500);
    }

    // Create token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY);
    const token = await new jose.SignJWT({ ...adminTokenData }) // Spread the data to ensure it's a plain object
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${oneDayInSeconds}s`)
      .sign(secret);

    // Update last login time
    admin.lastLogin = new Date();
    await admin.save();

    const data = {
      adminId: admin._id.toString(),
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles,
      action: "ADMIN_LOGIN",
      module: "AUTHENTICATION",
      details: { email: admin.email },
      request: request,
    };

    await logAdminAction(data);

    const response = NextResponse.json(
      {
        message: "Login successful",
        success: true,
        admin: {
          id: admin._id.toString(),
          name: admin.name,
          email: admin.email,
          roles: admin.roles,
        },
      },
      { status: 200 }
    );

    response.cookies.set("adminToken", token, {
      httpOnly: true,
      maxAge: oneDayInSeconds,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return response;
  } catch (error) {
    console.error("Admin sign-in error:", error);
    return handleApiError(error);
  }
}
