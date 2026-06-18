import {
  IShippingMethod,
  IPayoutAccount,
  StoreVerification,
  StoreBusinessInfo,
} from "@/lib/db/models/store.model";
import {
  StoreStatusEnum,
  StoreBusinessInfoEnum,
  StoreVerificationStatusEnum,
} from "@/enums";

/**
 * Read‑only contract for any store representation (base or decorated).
 * All getters from the original Store class are exposed.
 */
export interface StoreInterface {
  // Basic info
  storeId: string;
  storeName: string;
  email: string;
  uniqueId: string;
  ownerId?: string;
  password?: string; // only for authenticated flows, avoid exposing in public

  // Relations (IDs only, as in base entity)
  followers: string[];
  products: string[]; // stays as IDs – never overridden
  followersCount: number;
  productsCount: number;
  description?: string;

  // Verification
  verification?: StoreVerification; // typed properly in real code
  isVerified: boolean;
  verificationMethod?: StoreVerificationStatusEnum;
  verifiedAt?: Date;

  // Business info
  businessInfo?: StoreBusinessInfo;
  businessName?: string;
  businessType?: StoreBusinessInfoEnum;
  registrationNumber?: string;
  taxId?: string;

  // Ratings
  averageRating: number;
  reviewCount: number;
  complaintCount: number;

  // Status / Moderation
  status?: StoreStatusEnum;
  isActive: boolean;
  suspensionReason?: string;

  // Legal
  agreedToTermsAt?: Date;

  // Security
  lastOtpRequestAt?: Date;
  otpBlockedUntil?: Date;
  isOtpBlocked: boolean;

  // Financial
  walletId?: string;

  // Shipping & Payouts
  shippingMethods: IShippingMethod[];
  activeShippingMethods: IShippingMethod[];
  payoutAccounts: IPayoutAccount[];
  hasPayoutSetup: boolean;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;

  // Safe output (excludes password)
  // toPublicJSON(): any;
}
