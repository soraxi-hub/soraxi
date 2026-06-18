import { getAdminById } from "@/lib/db/models/admin.model";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getAdminPermissions } from "@/modules/admin/jwt-utils";
import { CookieService } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { type NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get("adminToken")?.value;

    if (!adminToken) {
      throw new AppError("UNAUTHORIZED", "Authentication required");
    }

    await connectToDatabase();

    const tokenData = await CookieService.verifyAdminToken(adminToken);

    if (!tokenData) {
      throw new AppError("UNAUTHORIZED", "Invalid or expired token");
    }

    const admin = await getAdminById(tokenData.id, true);

    if (!admin || !admin.isActive) {
      throw new AppError("FORBIDDEN", "Admin account not found or inactive", {
        adminId: tokenData.id,
        isActive: admin?.isActive,
      });
    }

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
    return handleApiError(error);
  }
}
