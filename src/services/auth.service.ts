import { AuthUser } from "@/domain/users/user";
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
  ): Promise<{ authUser: AuthUser; tokenPayload: UserTokenPayload }> {
    const user = await UserRepository.findUserByEmail(email);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const authUser = UserFactory.createLoginUser(user);

    const isValidPassword = await authUser.validatePassword(password);

    if (!isValidPassword) {
      throw new AppError("Invalid Credentials", 401);
    }

    const tokenPayload = CookieService.generateUserToken(authUser);

    return { authUser, tokenPayload };
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
      throw new AppError("Store not found", 404, "not_found", "StoreNotFound");
    }

    const authStore = StoreFactory.buildAuthenticatedStore(store);
    const isPasswordValid = await authStore.validatePassword(password);

    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
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
      throw new AppError("Invalid credentials", 401);
    }

    const authAdmin = AdminFactory.createAuthenticatedAdmin(admin);

    // Check active status
    if (authAdmin.isInactive) {
      throw new AppError(
        "Your account has been deactivated. Please contact the system administrator.",
        401,
      );
    }

    // Validate password
    const isPasswordValid = await authAdmin.validatePassword(password);

    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401);
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Prepare token payload (keep it serializable)
    const tokenPayload = CookieService.generateAdminToken(admin);

    return { admin: authAdmin, tokenPayload };
  }
}
