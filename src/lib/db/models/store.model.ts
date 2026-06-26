import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { nairaToKobo } from "@/lib/utils/naira";
import {
  StoreBusinessInfoEnum,
  StoreStatusEnum,
  StoreVerificationStatusEnum,
} from "@/enums";

/**
 * Shipping Method Schema Subdocument Interface
 */
export interface IShippingMethod {
  _id?: mongoose.Types.ObjectId;
  name: string;
  price: number;
  estimatedDeliveryDays: number; // Estimated number of days for delivery after order placement (e.g., "3-5 days")
  isActive?: boolean;
  description: string;
}

/**
 * Payout Account Subdocument Interface
 */
export interface IPayoutAccount {
  _id?: mongoose.Types.ObjectId;
  payoutMethod: "Bank Transfer";
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    bankCode: number;
    bankId?: number;
  };
}

/**
 * Represents the verification status and details of a store.
 */
export interface StoreVerification {
  isVerified: boolean;
  method: StoreVerificationStatusEnum;
  verifiedAt?: Date;
  notes?: string;
}

/**
 * Contains business registration information for a store.
 */
export interface StoreBusinessInfo {
  businessName?: string;
  registrationNumber?: string; // e.g., company registration number like CAC for Nigerians
  type: StoreBusinessInfoEnum;
  documentUrls?: string[];
}

/**
 * Holds rating and review metrics for a store.
 */
export interface StoreRatings {
  averageRating: number;
  reviewCount: number;
  complaintCount: number;
}

/**
 * Store Document Interface
 */
export interface IStore {
  _id: mongoose.Types.ObjectId;
  name: string;
  password: string;
  storeOwner: mongoose.Types.ObjectId;
  storeEmail: string;
  uniqueId: string;
  followers: mongoose.Types.ObjectId[];
  physicalProducts: mongoose.Types.ObjectId[];
  description?: string;

  // Verification
  verification?: StoreVerification;

  // Business Registration Info
  businessInfo?: StoreBusinessInfo;

  // Ratings
  ratings?: StoreRatings;

  // Store Status & Moderation
  status: StoreStatusEnum;
  suspensionReason?: string;

  // Legal Agreement
  agreedToTermsAt?: Date;

  // Security
  lastOtpRequestAt?: Date; // NEW: Prevent OTP spam
  otpRequestBlockedUntil?: Date; // NEW: Prevent a user from requesting many OTPs within a short period of time

  // Financials
  walletId: mongoose.Schema.Types.ObjectId;

  // Shipping
  shippingMethods: IShippingMethod[];

  // Payouts
  payoutAccounts: IPayoutAccount[];

  security: {
    hasChangedDefaultPassword: boolean;
    passwordChangedAt: Date;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export type IStoreDocument = IStore & Document;

/**
 * Define Store Schema
 */
const ShippingMethodSchema = new Schema<IShippingMethod>({
  name: {
    type: String,
    required: [true, "Shipping method name is required"],
  },
  price: {
    type: Number,
    set: (price: number) => nairaToKobo(price),
    required: [true, "Shipping price is required"],
  },
  estimatedDeliveryDays: Number,
  isActive: { type: Boolean, default: true },
  description: String,
});

const PayoutAccountSchema = new Schema<IPayoutAccount>({
  payoutMethod: {
    type: String,
    enum: {
      values: ["Bank Transfer"],
      message: "Invalid payout method",
    },
    required: [true, "Payout method is required"],
  },
  bankDetails: {
    bankName: {
      type: String,
      required: [true, "Bank name is required"],
    },
    accountNumber: {
      type: String,
      required: [true, "Bank account number is required"],
    },
    accountHolderName: {
      type: String,
      required: [true, "Account holder name is required"],
    },
    bankCode: {
      type: Number,
      required: [true, "Bank code is required"],
    },
    bankId: Number,
  },
});

const StoreSchema = new Schema<IStoreDocument>(
  {
    name: {
      type: String,
      required: [true, "Store name is required"],
    },
    password: {
      type: String,
      required: [true, "Store password is required"],
    },
    storeOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Store owner is required"],
    },
    storeEmail: {
      type: String,
      required: [true, "Store email is required"],
      unique: true,
    },
    uniqueId: {
      type: String,
      required: [true, "Store unique ID is required"],
      unique: true,
    },
    followers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    physicalProducts: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },

    // Store description
    description: String,

    // Verification block
    verification: {
      isVerified: { type: Boolean, default: false },
      method: {
        type: String,
        enum: Object.values(StoreVerificationStatusEnum),
        default: StoreVerificationStatusEnum.Email,
      },
      verifiedAt: Date,
      notes: String,
    },

    // Business registration (for companies)
    businessInfo: {
      businessName: String,
      registrationNumber: String,
      taxId: String,
      type: {
        type: String,
        enum: Object.values(StoreBusinessInfoEnum),
        default: StoreBusinessInfoEnum.Individual,
      },
      documentUrls: [String],
    },

    // Ratings
    ratings: {
      averageRating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      complaintCount: { type: Number, default: 0 },
    },

    // Admin moderation / status
    status: {
      type: String,
      enum: Object.values(StoreStatusEnum),
      default: StoreStatusEnum.Pending,
    },
    suspensionReason: String,

    // Terms/legal agreement
    agreedToTermsAt: Date,

    // Security
    lastOtpRequestAt: {
      type: Date,
    },
    otpRequestBlockedUntil: {
      type: Date,
    },

    // Financials
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },

    // Shipping
    shippingMethods: {
      type: [ShippingMethodSchema],
      default: [],
    },

    // Payout setup
    payoutAccounts: {
      type: [PayoutAccountSchema],
      default: [],
    },

    // Security
    security: {
      hasChangedDefaultPassword: {
        type: Boolean,
        default: false,
      },
      passwordChangedAt: Date,
    },
  },
  { timestamps: true },
);

StoreSchema.pre("save", function (next) {
  if (this.shippingMethods && this.shippingMethods.length > 0) {
    const hasActiveShipping = this.shippingMethods.some(
      (method) => method.isActive !== false,
    );
    if (!hasActiveShipping) {
      return next(
        new Error("Store must have at least one active shipping method"),
      );
    }
  }
  next();
});

StoreSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
StoreSchema.index({ storeOwner: 1 });
StoreSchema.index({ status: 1 });
StoreSchema.index({ walletId: 1 });

/**
 * Get the Store model
 */
export async function getStoreModel(): Promise<Model<IStoreDocument>> {
  await connectToDatabase();
  return (
    (mongoose.models.Store as Model<IStoreDocument>) ||
    mongoose.model<IStoreDocument>("Store", StoreSchema)
  );
}
