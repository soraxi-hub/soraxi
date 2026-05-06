import { TRPCError } from "@trpc/server";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import { Permission } from "@/modules/admin/security/permissions";
import { AdminTokenPayload } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";

export class AdminGuard {
  private admin: AdminTokenPayload | null;

  constructor(admin: AdminTokenPayload | null) {
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
  require(permission: Permission): AdminTokenPayload {
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
  requireAny(permissions: Permission[]): AdminTokenPayload {
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
  requireAll(permissions: Permission[]): AdminTokenPayload {
    this.ensureAuthenticated();

    if (!checkAdminPermission(this.admin!, permissions)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    return this.admin!;
  }

  static from(admin: AdminTokenPayload | null) {
    return new AdminGuard(admin);
  }
}
