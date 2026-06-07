import { AuthUserDecorator } from "./decorators/auth-user.decorator";
import { ProfileUserDecorator } from "./decorators/profile-user-decorator";
import { BaseUser, User } from "./user";
import {
  AuthUserContext,
  IUserInfo,
  ProfileUserContext,
} from "./user-interface";

export class UserFactory {
  /**
   * Creates a base User object.
   * Useful for internal data processing.
   */
  static createBaseUser(props: BaseUser): User {
    return new User(props);
  }

  /**
   * Creates a user decorated with Authentication capabilities.
   * Use this for login, registration, and security checks.
   */
  static createAuthUser(props: AuthUserContext): AuthUserDecorator {
    const baseUser = new User({
      ...props,
      _id: props._id,
      address: "",
      cityOfResidence: "",
      stateOfResidence: "",
      postalCode: "",
      followingStores: [],
      phoneNumber: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      isVerified: false,
    });
    return new AuthUserDecorator(baseUser);
  }

  /**
   * Creates a user decorated for Profile/UI views.
   * Use this for dashboard screens and public profiles.
   */
  static createProfileUser(
    userProps: ProfileUserContext,
  ): ProfileUserDecorator {
    const baseUser = new User({
      ...userProps,
      _id: userProps._id,
      createdAt: new Date(),
      updatedAt: new Date(),
      password: "",
      followingStores: [],
    });
    return new ProfileUserDecorator(baseUser);
  }

  /**
   * Creates a "Full" User that has both Auth and Profile features.
   */
  static createFullUser(props: BaseUser): IUserInfo {
    let user: IUserInfo = new User(props);
    user = new ProfileUserDecorator(user);
    user = new AuthUserDecorator(user);
    return user;
  }
}
