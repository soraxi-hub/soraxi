import { getAdminByEmail as getAdminUsingAdminEmail } from "@/lib/db/models/admin.model";

export class AdminRepository {
  static async getAdminByEmail(email: string) {
    return await getAdminUsingAdminEmail(email, true);
  }
}
