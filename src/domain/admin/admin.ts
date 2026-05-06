import { IAdmin } from "@/lib/db/models/admin.model";
import { PasswordService } from "@/lib/utils";
import type { Role } from "@/modules/admin/security/roles";

/**
 * AdminProps
 * - Makes the class flexible (can accept lean objects or partials)
 * - Ensures storeOwner-like normalization (string instead of ObjectId)
 */
export type AdminProps = Partial<IAdmin>;

export class Admin {
  constructor(protected props: AdminProps) {}

  // -------------------------
  // BASIC INFO
  // -------------------------
  get adminId(): string | undefined {
    return this.props._id?.toString();
  }

  get name(): string {
    return this.props.name?.trim() || "Unnamed Admin";
  }

  get email(): string {
    return this.props.email || "No Email";
  }

  get password(): string | undefined {
    return this.props.password;
  }

  // -------------------------
  // ROLES / PERMISSIONS
  // -------------------------
  get roles(): Role[] {
    return (this.props.roles as Role[]) || [];
  }

  // -------------------------
  // STATUS
  // -------------------------
  get isActive(): boolean {
    return this.props.isActive ?? false;
  }

  get isInactive(): boolean {
    return !this.isActive;
  }

  // -------------------------
  // ACTIVITY
  // -------------------------
  get lastLogin(): Date | undefined {
    return this.props.lastLogin;
  }

  /**
   * Check if admin has ever logged in
   */
  get hasLoggedInBefore(): boolean {
    return !!this.props.lastLogin;
  }

  // -------------------------
  // SECURITY SAFE OUTPUT
  // -------------------------
  public toPublicJSON() {
    const { password, ...safeData } = this.props;
    return safeData;
  }
}
export class AuthenticatedAdmin extends Admin {
  constructor(admin: IAdmin) {
    super(admin);
  }

  async validatePassword(password: string): Promise<boolean> {
    return await PasswordService.validatePassword(password, this.password!);
  }

  get hasRoles(): boolean {
    return this.roles.length > 0;
  }

  /**
   * Check if admin has a specific role
   */
  hasRole(role: Role): boolean {
    return this.roles.includes(role);
  }

  /**
   * Check if admin is a super admin
   */
  get isSuperAdmin(): boolean {
    return this.hasRole("super_admin");
  }

  /**
   * Flexible permission check (future-proof)
   */
  hasAnyRole(roles: Role[]): boolean {
    return roles.some((role) => this.roles.includes(role));
  }
}
