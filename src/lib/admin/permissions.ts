import { getPermissionsForRoles, hasPermission } from "@/modules/shared/access-control"
import type { Permission } from "@/modules/shared/permissions"
import type { Role } from "@/modules/shared/roles"

/**
 * Admin Permission Utilities
 * Helper functions for checking admin permissions
 */

export interface AdminUser {
  id: string
  name: string
  email: string
  roles: Role[]
  isActive: boolean
}

/**
 * Check if admin has required permissions
 */
export function checkAdminPermission(admin: AdminUser, requiredPermissions: Permission[]): boolean {
  if (!admin.isActive) return false

  const adminPermissions = getPermissionsForRoles(admin.roles)
  return hasPermission(adminPermissions, requiredPermissions)
}

/**
 * Get all permissions for an admin
 */
export function getAdminPermissions(admin: AdminUser): Permission[] {
  return getPermissionsForRoles(admin.roles)
}

/**
 * Check if admin is super admin
 */
export function isSuperAdmin(admin: AdminUser): boolean {
  return admin.roles.includes("super_admin")
}

/**
 * Middleware helper to extract admin info from request
 */
export function getAdminFromRequest(request: Request): AdminUser | null {
  // This would typically extract admin info from JWT token or session
  // For now, returning null - implement based on your auth system
  return null
}
