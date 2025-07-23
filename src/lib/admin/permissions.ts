import {
  getPermissionsForRoles,
  hasPermission,
} from "@/modules/shared/access-control";
import type { Permission } from "@/modules/shared/permissions";
import type { Role } from "@/modules/shared/roles";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { AdminTokenData } from "../helpers/get-admin-from-cookie";

/**
 * Admin Permission Utilities
 * Helper functions for checking admin permissions
 */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: Role[] | string[];
  isActive: boolean;
}

/**
 * Check if admin has required permissions
 */
export function checkAdminPermission(
  admin: AdminUser,
  requiredPermissions: Permission[]
): boolean {
  if (!admin.isActive) return false;

  const adminPermissions = getPermissionsForRoles(admin.roles as Role[]);
  return hasPermission(adminPermissions, requiredPermissions);
}

/**
 * Get all permissions for an admin
 */
export function getAdminPermissions(admin: AdminUser): Permission[] {
  return getPermissionsForRoles(admin.roles as Role[]);
}

/**
 * Check if admin is super admin
 */
export function isSuperAdmin(admin: AdminUser): boolean {
  return admin.roles.includes("super_admin");
}

/**
 * Middleware helper to extract admin info from request
 */
export function getAdminFromRequest(request: NextRequest): AdminUser | null {
  // This would typically extract admin info from JWT token or session
  // For now, returning null - implement based on your auth system

  try {
    const encodedToken: string = request.cookies.get("adminToken")?.value || "";

    if (!encodedToken) throw new Error("No token found");

    const decoded = jwt.verify(
      encodedToken,
      process.env.JWT_SECRET_KEY!
    ) as AdminTokenData;

    const isValid =
      typeof decoded.id === "string" &&
      typeof decoded.name === "string" &&
      typeof decoded.email === "string" &&
      typeof decoded.isActive === "boolean" &&
      Array.isArray(decoded.roles) &&
      decoded.roles.every((role) => typeof role === "string");

    return isValid ? decoded : null;
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error getting user data from token:", err.message);
    return null;
  }
}
