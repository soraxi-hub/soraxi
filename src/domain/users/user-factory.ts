import { IUser } from "@/lib/db/models/user.model";
import { AuthUser, PublicUser } from "./user";
import { Admin } from "./admin";
import { ProfileUser, ProfileUserType } from "./profile-user";

export class UserFactory {
  static async createPublicUser(props: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    otherNames: string;
    phoneNumber: string;
    address: string;
    cityOfResidence: string;
    stateOfResidence: string;
    postalCode: string;
    isVerified: boolean;
  }): Promise<PublicUser> {
    return new PublicUser(
      props.email,
      props.password,
      props.firstName,
      props.lastName,
      props.otherNames,
      props.phoneNumber,
      props.address,
      props.cityOfResidence,
      props.stateOfResidence,
      props.postalCode,
      props.isVerified
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
        : undefined
    );
  }

  static async createAdmin(props: {
    email: string;
    password: string;
    name: string;
    roles: string[];
    isActive: boolean;
  }): Promise<Admin> {
    return new Admin(
      props.email,
      props.password,
      props.name,
      props.roles,
      props.isActive
    );
  }

  static createProfileUser(user: ProfileUserType) {
    return new ProfileUser(user);
  }
}
