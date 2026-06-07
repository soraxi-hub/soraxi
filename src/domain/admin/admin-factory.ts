import { AuthenticatedAdmin, BaseAdminProps } from "./admin";

export class AdminFactory {
  static createAuthenticatedAdmin(admin: BaseAdminProps): AuthenticatedAdmin {
    return new AuthenticatedAdmin(admin);
  }
}
