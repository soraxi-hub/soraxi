import { getAdminById } from "@/lib/db/models/admin.model";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  getAdminPermissions,
  verifyAdminToken,
} from "@/modules/admin/jwt-utils";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get("adminToken")?.value;

    if (!adminToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    // Connect to database to get the latest admin data
    await connectToDatabase();

    const tokenData = await verifyAdminToken(adminToken);

    if (!tokenData) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get admin from database to ensure they're still active
    const admin = await getAdminById(tokenData.id, true);

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: "Admin account not found or inactive" },
        { status: 403 }
      );
    }

    // Get permissions based on roles
    const permissions = getAdminPermissions(tokenData.roles);

    return NextResponse.json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        roles: admin.roles,
      },
      permissions,
    });
  } catch (error) {
    console.error("Error verifying admin auth:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
