import { PasswordService } from "@/lib/utils";
import { UserDecorator } from "./user-decorator";

export class AuthUserDecorator extends UserDecorator {
  // We only need to add what is unique to Auth
  async validatePassword(password: string): Promise<boolean> {
    // Note: We access the underlying props via a cast if needed,
    // or better yet, pass the hash through the interface if security allows.
    // const hashedPassword = (this.decoratedUser as any).props?.password;
    return await PasswordService.validatePassword(
      password,
      this.decoratedUser.password,
    );
  }

  async hashPassword(): Promise<void> {
    this.decoratedUser.password = await PasswordService.hashPassword(
      this.decoratedUser.password,
    );
  }
}
