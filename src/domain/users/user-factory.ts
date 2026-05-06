import { IUser } from "@/lib/db/models/user.model";
import { AuthUser, PublicUser } from "./user";
import { ProfileUser, ProfileUserType } from "./profile-user";

export class UserFactory {
  static createPublicUser(props: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: string;
    cityOfResidence: string;
    stateOfResidence: string;
    postalCode: string;
    isVerified: boolean;
  }): PublicUser {
    return new PublicUser(
      props.email,
      props.password,
      props.firstName,
      props.lastName,
      props.phoneNumber,
      props.address,
      props.cityOfResidence,
      props.stateOfResidence,
      props.postalCode,
      props.isVerified,
    );
  }

  static createLoginUser(dbUser: IUser): AuthUser {
    return new AuthUser(
      dbUser._id.toString(),
      dbUser.firstName,
      dbUser.lastName,
      dbUser.email,
      dbUser.password,
      dbUser.stores && dbUser.stores.length > 0 && dbUser.stores[0].storeId
        ? dbUser.stores[0].storeId.toString()
        : undefined,
    );
  }

  static createProfileUser(user: ProfileUserType) {
    return new ProfileUser(user);
  }
}
