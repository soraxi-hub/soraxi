import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * Shipping Method Schema Subdocument Interface
 */
export interface IShippingMethod {
  _id?: mongoose.Types.ObjectId;
  name: string;
  price: number;
  estimatedDeliveryDays: number;
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
  totalEarnings: number;
  lastPayoutDate: Date | null;
}

/**
 * Payout History Entry Interface
 */
export interface IPayoutHistory {
  payoutAccount: string;
  amount: number;
  payoutDate: Date;
  payoutMethodDetails: {
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
    };
    mobileWallet?: {
      walletProvider?: string;
      walletId?: string;
    };
  };
  status: "pending" | "completed" | "failed";
  transactionFees: number;
  platformFee: number;
  taxes: number;
}

/**
 * Store Document Interface
 */
export interface IStore extends Document {
  name: string;
  password: string;
  storeOwner: mongoose.Types.ObjectId;
  storeEmail: string;
  uniqueId: string;
  followers: mongoose.Types.ObjectId[];
  physicalProducts: mongoose.Types.ObjectId[];
  digitalProducts: mongoose.Types.ObjectId[];
  recipientCode: string;

  // Branding
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;

  // Verification
  verification?: {
    isVerified: boolean;
    method: "email" | "identity" | "video-call";
    verifiedAt?: Date;
    notes?: string;
  };

  // Business Registration Info
  businessInfo?: {
    businessName?: string;
    registrationNumber?: string; // e.g., company registration number like CAC for Nigerians
    taxId?: string;
    type: "individual" | "company";
    documentUrls?: string[];
  };

  // Ratings
  ratings?: {
    averageRating: number;
    reviewCount: number;
    complaintCount: number;
  };

  // Store Status & Moderation
  status: "active" | "suspended" | "pending" | "rejected";
  suspensionReason?: string;

  // Legal Agreement
  agreedToTermsAt?: Date;

  // Security
  forgotpasswordToken?: string;
  forgotpasswordTokenExpiry?: Date;

  // Financials
  platformFee: number;
  transactionFees: number;
  wallet: mongoose.Schema.Types.ObjectId;

  // Shipping
  shippingMethods: IShippingMethod[];

  // Payouts
  payoutAccounts: IPayoutAccount[];
  payoutHistory: IPayoutHistory[];

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
  price: { type: Number, required: [true, "Shipping price is required"] },
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

const PayoutAccountSchema = new Schema<IPayoutAccount>(
  {
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
    totalEarnings: { type: Number, default: 0 },
    lastPayoutDate: { type: Date, default: null },
  },
  { _id: false }
);

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
    digitalProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "digitalproducts" },
    ],
    recipientCode: {
      type: String,
      unique: true,
    },

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
        enum: ["email", "identity", "video-call"],
        default: "email",
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
        enum: ["individual", "company"],
        default: "individual",
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
      enum: ["active", "suspended", "pending", "rejected"],
      default: "pending",
    },
    suspensionReason: String,

    // ✅ Terms/legal agreement
    agreedToTermsAt: Date,

    // ✅ Security
    forgotpasswordToken: String,
    forgotpasswordTokenExpiry: Date,

    // ✅ Financials
    platformFee: { type: Number, default: 0 },
    transactionFees: { type: Number, default: 0 },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    // ✅ Shipping
    shippingMethods: [ShippingMethodSchema],

    // ✅ Payout setup
    payoutAccounts: [PayoutAccountSchema],

    // ✅ Payout history
    payoutHistory: [
      {
        payoutAccount: {
          type: String,
          required: [true, "Payout account is required"],
        },
        amount: {
          type: Number,
          required: [true, "Payout amount is required"],
        },
        payoutDate: {
          type: Date,
          default: Date.now,
        },
        payoutMethodDetails: {
          bankDetails: {
            bankName: String,
            accountNumber: String,
          },
          mobileWallet: {
            walletProvider: String,
            walletId: String,
          },
        },
        status: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "pending",
        },
        transactionFees: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        taxes: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

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
