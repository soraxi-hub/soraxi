import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { nairaToKobo } from "@/lib/utils/naira";

export enum StoreStatus {
  Active = "active",
  Suspended = "suspended",
  Pending = "pending",
  Rejected = "rejected",
}

export enum StoreVerificationStatus {
  Email = "email",
  Identity = "identity",
  videoCall = "video_call",
}

export enum StoreBusinessInfo {
  Individual = "individual",
  Company = "company",
}

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
  applicableRegions?: string[];
  conditions?: {
    minOrderValue?: number;
    maxOrderValue?: number;
    minWeight?: number;
    maxWeight?: number;
  };
}

/**
 * Payout Account Subdocument Interface
 */
export interface IPayoutAccount {
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
 * Store Document Interface
 */
export interface IStore extends Document {
  _id: mongoose.Schema.Types.ObjectId;
  name: string;
  password: string;
  storeOwner: mongoose.Types.ObjectId;
  storeEmail: string;
  uniqueId: string;
  followers: mongoose.Types.ObjectId[];
  physicalProducts: mongoose.Types.ObjectId[];

  // Branding
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;

  // Verification
  verification?: {
    isVerified: boolean;
    method: StoreVerificationStatus;
    verifiedAt?: Date;
    notes?: string;
  };

  // Business Registration Info
  businessInfo?: {
    businessName?: string;
    registrationNumber?: string; // e.g., company registration number like CAC for Nigerians
    taxId?: string;
    type: StoreBusinessInfo;
    documentUrls?: string[];
  };

  // Ratings
  ratings?: {
    averageRating: number;
    reviewCount: number;
    complaintCount: number;
  };

  // Store Status & Moderation
  status: StoreStatus;
  suspensionReason?: string;

  // Legal Agreement
  agreedToTermsAt?: Date;

  // Security
  forgotpasswordToken?: string;
  forgotpasswordTokenExpiry?: Date;

  // Financials
  walletId: mongoose.Schema.Types.ObjectId;

  // Shipping
  shippingMethods: IShippingMethod[];

  // Payouts
  payoutAccounts: IPayoutAccount[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

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
  applicableRegions: [String],
  conditions: {
    minOrderValue: Number,
    maxOrderValue: Number,
    minWeight: Number,
    maxWeight: Number,
  },
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

const StoreSchema = new Schema<IStore>(
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
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    physicalProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],

    // ✅ Optional store branding
    logoUrl: String,
    bannerUrl: String,

    // ✅ Store description
    description: String,

    // ✅ Verification block
    verification: {
      isVerified: { type: Boolean, default: false },
      method: {
        type: String,
        enum: Object.values(StoreVerificationStatus),
        default: StoreVerificationStatus.Email,
      },
      verifiedAt: Date,
      notes: String,
    },

    // ✅ Business registration (for companies)
    businessInfo: {
      businessName: String,
      registrationNumber: String,
      taxId: String,
      type: {
        type: String,
        enum: Object.values(StoreBusinessInfo),
        default: StoreBusinessInfo.Individual,
      },
      documentUrls: [String],
    },

    // ✅ Ratings
    ratings: {
      averageRating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      complaintCount: { type: Number, default: 0 },
    },

    // ✅ Admin moderation / status
    status: {
      type: String,
      enum: Object.values(StoreStatus),
      default: StoreStatus.Pending,
    },
    suspensionReason: String,

    // ✅ Terms/legal agreement
    agreedToTermsAt: Date,

    // ✅ Security
    forgotpasswordToken: String,
    forgotpasswordTokenExpiry: Date,

    // ✅ Financials
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      validate: {
        validator: async (walletId: mongoose.Schema.Types.ObjectId) => {
          if (!walletId) return true; // Allow null/undefined wallets

          // Check if wallet exists in database
          const Wallet = mongoose.models.Wallet;
          if (!Wallet) return true; // Skip validation if Wallet model not available

          const wallet = await Wallet.findById(walletId);
          return !!wallet;
        },
        message: "Referenced wallet does not exist",
      },
    },

    // ✅ Shipping
    shippingMethods: [ShippingMethodSchema],

    // ✅ Payout setup
    payoutAccounts: [PayoutAccountSchema],
  },
  { timestamps: true }
);

StoreSchema.pre("save", function (next) {
  if (this.shippingMethods && this.shippingMethods.length > 0) {
    const hasActiveShipping = this.shippingMethods.some(
      (method) => method.isActive !== false
    );
    if (!hasActiveShipping) {
      return next(
        new Error("Store must have at least one active shipping method")
      );
    }
  }
  next();
});

/**
 * Get the Store model
 */
export async function getStoreModel(): Promise<Model<IStore>> {
  await connectToDatabase();
  return (
    (mongoose.models.Store as Model<IStore>) ||
    mongoose.model<IStore>("Store", StoreSchema)
  );
}

/**
 * Get store by unique ID
 */
export async function getStoreByUniqueId(
  uniqueId: string
): Promise<IStore | null> {
  await connectToDatabase();
  const Store = await getStoreModel();
  return Store.findById(uniqueId).lean();
}
