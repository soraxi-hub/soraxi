import { AppRouter } from "@/trpc/routers/_app";
import { inferProcedureOutput } from "@trpc/server";

export type ProfileUserType = inferProcedureOutput<
  AppRouter["user"]["getById"]
>;

export class ProfileUser {
  protected UserProfile: ProfileUserType | null = null;

  constructor(user: ProfileUserType) {
    this.setUser(user);
  }

  setUser(user: ProfileUserType) {
    this.UserProfile = user;
  }

  getUserFullName() {
    return `${this.UserProfile?.firstName} ${this.UserProfile?.otherNames} ${this.UserProfile?.lastName}`;
  }

  getUserFirstName() {
    return `${this.UserProfile?.firstName}`;
  }

  getUserLastName() {
    return `${this.UserProfile?.lastName}`;
  }

  getUserOtherName() {
    return `${this.UserProfile?.otherNames}`;
  }

  getUserEmail() {
    return `${this.UserProfile?.email}`;
  }

  getUserPhoneNumber() {
    return `${this.UserProfile?.phoneNumber}`;
  }

  getUserAddress() {
    return `${this.UserProfile?.address}`;
  }

  getUserStateOfResidence() {
    return `${this.UserProfile?.stateOfResidence}`;
  }

  getUserCityOfResidence() {
    return `${this.UserProfile?.cityOfResidence}`;
  }

  getUserPostalCode() {
    return `${this.UserProfile?.postalCode}`;
  }

  getUserIsVerified() {
    return this.UserProfile?.isVerified;
  }

  getUserStores() {
    const stores = this.UserProfile?.stores || [];
    return stores;
  }
}
