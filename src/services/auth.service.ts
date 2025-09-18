import { AuthUser, User } from "@/domain/users/User";
import { UserFactory } from "@/domain/users/UserFactory";
import { AppError } from "@/lib/errors/app-error";
import { UserRepository } from "@/repositories/user-repo";

export class AuthService extends User {
  constructor(email: string, password: string) {
    super(email, password);
  }

  static async userLogin(email: string, password: string): Promise<AuthUser> {
    const user = await UserRepository.findUserByEmail(email);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const authUser = UserFactory.createLoginUser(user);

    const isValidPassword = await authUser.validatePassword(password);

    if (!isValidPassword) {
      throw new AppError("Invalid Credentials", 401);
    }

    return authUser;
  }
}
