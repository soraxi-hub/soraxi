import { truncateText } from "@/lib/utils";
import { IUserInfo } from "../user-interface";

export abstract class UserDecorator implements IUserInfo {
  protected decoratedUser: IUserInfo;

  constructor(user: IUserInfo) {
    this.decoratedUser = user;
  }

  get userId() {
    return this.decoratedUser.userId;
  }
  get firstName() {
    return this.decoratedUser.firstName;
  }
  get lastName() {
    return this.decoratedUser.lastName;
  }
  get fullName() {
    return truncateText(this.decoratedUser.fullName, 40) as string;
  }
  get email() {
    return this.decoratedUser.email;
  }
  get password() {
    return this.decoratedUser.password;
  }
  get phoneNumber() {
    return this.decoratedUser.phoneNumber;
  }
  get address() {
    return this.decoratedUser.address;
  }
  get city() {
    return this.decoratedUser.city;
  }
  get state() {
    return this.decoratedUser.state;
  }
  get postalCode() {
    return this.decoratedUser.postalCode;
  }
  get fullAddress() {
    return this.decoratedUser.fullAddress;
  }
  get isVerified() {
    return this.decoratedUser.isVerified;
  }
  get followingStores() {
    return this.decoratedUser.followingStores;
  }
  get followingCount() {
    return this.decoratedUser.followingCount;
  }
  get ownedStores() {
    return this.decoratedUser.ownedStores;
  }
  get ownedStoresCount() {
    return this.decoratedUser.ownedStoresCount;
  }
  get lastOtpRequestAt() {
    return this.decoratedUser.lastOtpRequestAt;
  }
  get otpBlockedUntil() {
    return this.decoratedUser.otpBlockedUntil;
  }
  get isOtpBlocked() {
    return this.decoratedUser.isOtpBlocked;
  }
  get createdAt() {
    return this.decoratedUser.createdAt;
  }
  get updatedAt() {
    return this.decoratedUser.updatedAt;
  }
}
