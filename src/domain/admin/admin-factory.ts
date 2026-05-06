import { IAdmin } from "@/lib/db/models/admin.model";
import { AuthenticatedAdmin } from "./admin";

export class AdminFactory {
  static createAuthenticatedAdmin(admin: IAdmin): AuthenticatedAdmin {
    return new AuthenticatedAdmin(admin);
  }
}
