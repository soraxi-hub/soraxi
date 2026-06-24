import { UserFactory } from "@/domain/users/user-factory";
import { AppError } from "@/lib/errors/app-error";
import { UserRepository } from "@/repositories/user-repo";
import {
  AdminTokenPayload,
  CookieService,
  StoreTokenPayload,
  UserTokenPayload,
} from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { StoreRepository } from "@/repositories/store-repo";
import { StoreFactory } from "@/domain/stores/store-factory";
import { AuthenticatedStore } from "@/domain/stores/auth-store";
import { AdminRepository } from "@/repositories/admin-repo";
import { AuthenticatedAdmin } from "@/domain/admin/admin";
import { AdminFactory } from "@/domain/admin/admin-factory";

export class AuthService {
  static async userLogin(
    email: string,
    password: string,
  ): Promise<{ tokenPayload: UserTokenPayload }> {
    const user = await UserRepository.findUserByEmail(email);

    if (!user) {
      throw new AppError("NOT_FOUND", "User not found", { email });
    }

    const authUser = UserFactory.createAuthUser(user);

    const isValidPassword = await authUser.validatePassword(password);

    if (!isValidPassword) {
      throw new AppError("UNAUTHORIZED", "Invalid Credentials", { email });
    }

    const tokenPayload = CookieService.generateUserToken(authUser);

    return { tokenPayload };
  }

  static async storeLogin(
    storeEmail: string,
    password: string,
  ): Promise<{
    store: AuthenticatedStore;
    tokenData: StoreTokenPayload;
    onboarding: {
      profileComplete: boolean;
      businessInfoComplete: boolean;
      shippingComplete: boolean;
      termsComplete: boolean;
      isComplete: boolean;
      completedSteps: number;
      totalSteps: number;
      percentage: number;
    };
  }> {
    const store = await StoreRepository.findStoreByEmail(storeEmail);

    if (!store) {
      throw new AppError("NOT_FOUND", "Store not found", { storeEmail });
    }

    const authStore = StoreFactory.buildAuthenticatedStore(store);
    const isPasswordValid = await authStore.validatePassword(password);

    if (!isPasswordValid) {
      throw new AppError("UNAUTHORIZED", "Invalid credentials", { storeEmail });
    }

    const tokenPayload = CookieService.generateStoreToken(store);

    return {
      tokenData: tokenPayload,
      store: authStore,
      onboarding: authStore.getOnboardingStats(),
    };
  }

  static async adminLogin(
    email: string,
    password: string,
  ): Promise<{
    admin: AuthenticatedAdmin;
    tokenPayload: AdminTokenPayload;
  }> {
    const admin = await AdminRepository.getAdminByEmail(email);

    if (!admin) {
      throw new AppError("UNAUTHORIZED", "Invalid credentials", { email });
    }

    const authAdmin = AdminFactory.createAuthenticatedAdmin({
      ...admin,
      _id: admin._id.toString(),
    });

    // Check active status
    if (authAdmin.isInactive) {
      throw new AppError(
        "FORBIDDEN",
        "Your account has been deactivated. Please contact the system administrator.",
        { email },
      );
    }

    // Validate password
    const isPasswordValid = await authAdmin.validatePassword(password);

    if (!isPasswordValid) {
      throw new AppError("UNAUTHORIZED", "Invalid credentials", { email });
    }

    // Update last login
    // admin.lastLogin = new Date();
    // await admin.save();

    // Prepare token payload (keep it serializable)
    const tokenPayload = CookieService.generateAdminToken(admin);

    return { admin: authAdmin, tokenPayload };
  }
}
