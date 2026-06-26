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
import { PasswordService } from "@/lib/utils";
import { IUserDocument } from "@/lib/db/models/user.model";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import {
  getStoreModel,
  IStore,
  IStoreDocument,
} from "@/lib/db/models/store.model";

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

  static async verifyCurrentPassword(
    identifierEmail: string,
    rawPassword: string,
    ref: "user" | "store",
  ): Promise<void> {
    if (ref === "store") {
      const storeModel = await getStoreModel();
      const store = await QueryBuilderFactory.queryBuilder<IStore>(storeModel)
        .where("storeEmail", identifierEmail)
        .executeOne();

      if (!store) {
        throw new AppError("NOT_FOUND", "Store not found", {
          email: identifierEmail,
        });
      }

      const authStore = StoreFactory.buildAuthenticatedStore(store);
      const isValid = await authStore.validatePassword(rawPassword);

      if (!isValid) {
        throw new AppError("UNAUTHORIZED", "Current password is incorrect");
      }

      return;
    }

    const user = await UserRepository.findUserByEmail(identifierEmail);

    if (!user) {
      throw new AppError("NOT_FOUND", "User not found", {
        email: identifierEmail,
      });
    }

    const authUser = UserFactory.createAuthUser(user);
    const isValid = await authUser.validatePassword(rawPassword);

    if (!isValid) {
      throw new AppError("UNAUTHORIZED", "Current password is incorrect");
    }
  }

  static async updatePassword(
    identifierEmail: string,
    rawPassword: string,
    ref: "user" | "store",
  ): Promise<IUserDocument | IStoreDocument> {
    const hashedPassword = await PasswordService.hashPassword(rawPassword);

    if (ref === "store") {
      const storeModel = await getStoreModel();
      const rawDoc = await QueryBuilderFactory.queryBuilder<IStore>(storeModel)
        .where("storeEmail", identifierEmail)
        .executeOne();

      if (!rawDoc)
        throw new AppError("NOT_FOUND", "Store not found", {
          email: identifierEmail,
        });

      const store = StoreFactory.store({
        ...rawDoc,
        storeOwner: rawDoc.storeOwner.toString(),
      });

      store.password = hashedPassword;

      const updatedStore = await StoreRepository.persistUpdatedPassword(store);

      if (!updatedStore)
        throw new AppError("NOT_FOUND", "User not found", {
          email: identifierEmail,
        });

      return updatedStore;
    }

    const rawDoc = await UserRepository.findUserByEmail(identifierEmail);

    if (!rawDoc)
      throw new AppError("NOT_FOUND", "User not found", {
        email: identifierEmail,
      });

    const user = UserFactory.createBaseUser(rawDoc);

    user.password = hashedPassword;

    const updatedUser = await UserRepository.persistUpdatedPassword(user);

    if (!updatedUser)
      throw new AppError("NOT_FOUND", "User not found", {
        email: identifierEmail,
      });

    return updatedUser;
  }
}
