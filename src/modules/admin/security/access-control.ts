import { AdminUser } from "@/lib/helpers/get-admin-from-cookie";
import { Permission } from "./permissions";
import { Role, ROLE_PERMISSIONS } from "./roles";

/**
 * Check if a user has at least one of the required permissions
 * @param userPermissions - Permissions assigned to user
 * @param requiredPermissions - Permissions required for route or action
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  if (requiredPermissions.length === 0) return true;
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission)
  );
}

/**
 * Get flattened permissions for a given set of roles
 * @param roles - Array of roles
 * @returns Flattened unique permission list
 */
export function getPermissionsForRoles(roles: Role[]): Permission[] {
  const all = roles.flatMap((role) => ROLE_PERMISSIONS[role] || []);
  return Array.from(new Set(all)); // Remove duplicates
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
