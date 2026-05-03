import { TRPCError } from "@trpc/server";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import { AdminTokenData } from "@/lib/helpers/get-admin-from-cookie";
import { Permission } from "@/modules/admin/security/permissions";

export class AdminGuard {
  private admin: AdminTokenData | null;

  constructor(admin: AdminTokenData | null) {
    this.admin = admin;
  }

  /**
   * Ensures admin exists
   */
  private ensureAuthenticated() {
    if (!this.admin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Admin authentication required",
      });
    }
  }

  /**
   * Require a single permission
   */
  require(permission: Permission): AdminTokenData {
    this.ensureAuthenticated();

    if (!checkAdminPermission(this.admin!, [permission])) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    return this.admin!;
  }

  /**
   * Require at least one permission from a list
   */
  requireAny(permissions: Permission[]): AdminTokenData {
    this.ensureAuthenticated();

    if (!checkAdminPermission(this.admin!, permissions)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    return this.admin!;
  }

  /**
   * Require all permissions
   */
  requireAll(permissions: Permission[]): AdminTokenData {
    this.ensureAuthenticated();

    if (!checkAdminPermission(this.admin!, permissions)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    return this.admin!;
  }

  static from(admin: AdminTokenData | null) {
    return new AdminGuard(admin);
  }
}
