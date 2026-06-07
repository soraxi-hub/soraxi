import { IUser } from "@/lib/db/models/user.model";
import { IUserInfo, PublicToJSONUserType } from "./user-interface";

export type BaseUser = IUser;

export class User implements IUserInfo {
  constructor(protected props: BaseUser) {}

  get userId(): string | undefined {
    return this.props._id?.toString();
  }

  get firstName(): string {
    return this.props.firstName.trim();
  }

  get lastName(): string {
    return this.props.lastName.trim();
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  get email(): string {
    return this.props.email;
  }

  get password(): string {
    return this.props.password;
  }

  get phoneNumber(): string {
    return this.props.phoneNumber;
  }

  get address(): string {
    return this.props.address;
  }

  get city(): string {
    return this.props.cityOfResidence;
  }

  get state(): string {
    return this.props.stateOfResidence;
  }

  get postalCode(): string {
    return this.props.postalCode;
  }

  get fullAddress(): string {
    return [this.address, this.city, this.state].filter(Boolean).join(", ");
  }

  get isVerified(): boolean {
    return this.props.isVerified ?? false;
  }

  get followingStores(): string[] {
    return this.props.followingStores.map((id) => id.toString()) || [];
  }

  get followingCount(): number {
    return this.followingStores.length;
  }

  get ownedStores(): string[] {
    return this.props.stores?.map((s) => s.storeId.toString()) || [];
  }

  get ownedStoresCount(): number {
    return this.ownedStores.length;
  }

  get lastOtpRequestAt(): Date | undefined {
    return this.props.lastOtpRequestAt;
  }

  get otpBlockedUntil(): Date | undefined {
    return this.props.otpRequestBlockedUntil;
  }

  get isOtpBlocked(): boolean {
    if (!this.props.otpRequestBlockedUntil) return false;
    return new Date() < this.props.otpRequestBlockedUntil;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Convert domain object into plain JSON object
   */
  toJSON(): PublicToJSONUserType {
    if (!this.userId) {
      throw new Error("UserId Required");
    }

    return {
      userId: this.userId,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      displayGreeting: `Greetings, ${this.firstName}!`,
      email: this.email,
      phoneNumber: this.phoneNumber,
      address: this.address,
      city: this.city,
      state: this.state,
      postalCode: this.postalCode,
      fullAddress: this.fullAddress,
      isVerified: this.isVerified,
      lastOtpRequestAt: this.lastOtpRequestAt,
      otpRequestBlockedUntil: this.otpBlockedUntil,
      isOtpBlocked: this.isOtpBlocked,
    };
  }
}
