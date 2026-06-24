import { IUser } from "@/lib/db/models/user.model";
import { Types } from "mongoose";
import { BaseUser } from "./user";

export interface IUserInfo {
  userId: string | undefined;
  firstName: string;
  lastName: string;
  password: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  fullAddress: string;
  isVerified: boolean;
  followingStores: string[];
  followingCount: number;
  ownedStores: string[];
  ownedStoresCount: number;
  lastOtpRequestAt: Date | undefined;
  otpBlockedUntil: Date | undefined;
  isOtpBlocked: boolean;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

/**
 * Properties required for creating a user during sign‑up.
 * These are the fields the client sends in the registration request.
 */
export type SignupUserContext = Pick<
  BaseUser,
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "phoneNumber"
  | "address"
  | "cityOfResidence"
  | "stateOfResidence"
  | "postalCode"
> & {
  /** Whether the email/phone has been verified; defaults to `false`. */
  isVerified?: boolean;
};

export type AuthUserContext = Pick<
  IUser,
  "firstName" | "lastName" | "email" | "password" | "stores"
> & {
  _id?: Types.ObjectId;
};

export type ProfileUserContext = Pick<
  IUser,
  | "_id"
  | "firstName"
  | "lastName"
  | "email"
  | "phoneNumber"
  | "address"
  | "cityOfResidence"
  | "stateOfResidence"
  | "postalCode"
  | "isVerified"
  | "stores"
>;

export type PublicToJSONUserType = Omit<
  IUser,
  | "_id"
  | "password"
  | "followingStores"
  | "stores"
  | "cityOfResidence"
  | "stateOfResidence"
  | "createdAt"
  | "updatedAt"
  | "followingStores"
  | "followingCount"
  | "ownedStores"
  | "ownedStoresCount"
> & {
  userId: string;
  fullName: string;
  displayGreeting: string;
  city: string;
  state: string;

  fullAddress: string;

  isOtpBlocked: boolean;
};
