import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * Fund Release Trigger - What condition triggered the release
 */
export enum FundReleaseTrigger {
  // Automatic triggers
  TimeElapsed = "time_elapsed", // After N business days
  DeliveryConfirmed = "delivery_confirmed", // Customer confirmed delivery
  AutoConfirmedDelivery = "auto_confirmed_delivery", // System auto-confirmed after 3 days
  BuyerProtectionExpired = "buyer_protection_expired", // 7-30 day protection window passed

  // Manual triggers
  AdminApproved = "admin_approved", // Admin manually approved
  AdminForced = "admin_forced", // Admin forced early release

  // Exception triggers
  OrderCancelled = "order_cancelled", // Order was cancelled, refund issued
  DisputeResolved = "dispute_resolved", // Chargeback/dispute resolved in seller's favor
  ReturnCompleted = "return_completed", // Return process finished
}

/**
 * Fund Release Status - Current state of the release
 */
export enum FundReleaseStatus {
  Pending = "pending", // Waiting for conditions to be met
  Ready = "ready", // All conditions met, waiting to process
  Processing = "processing", // Currently being transferred
  Released = "released", // Successfully transferred to store's wallet
  Failed = "failed", // Transfer failed
  Reversed = "reversed", // Release was reversed (chargeback, dispute lost)
}

export enum StoreVerificationStatusEnumUsedByFundRelease {
  Verified = "verified",
  Unverified = "unverified",
}

export enum StoreTierEnum {
  New = "new",
  Trusted = "trusted",
  Established = "established",
}

/**
 * Interface for Fund Release document
 * Tracks when funds move from escrow to seller wallet
 */
export interface IFundRelease extends Document {
  _id: mongoose.Types.ObjectId;

  // Reference IDs
  storeId: mongoose.Schema.Types.ObjectId;
  orderId: mongoose.Schema.Types.ObjectId;
  subOrderId: mongoose.Schema.Types.ObjectId;
  walletId: mongoose.Schema.Types.ObjectId;

  // Financial details
  settlement: {
    amount: number; // Amount after commission has been deducted
    shippingPrice: number; // Gotten from the selected Shipping method and added to the amount to reflect the total settlement for the store.
    commission: number; // Total commission amount deducted
    appliedPercentageFee: number;
    appliedFlatFee: number;
    notes?: string;
  };

  // Release rules applied
  releaseRules: {
    verificationStatus: StoreVerificationStatusEnumUsedByFundRelease;
    storeTier: StoreTierEnum;
    businessDaysRequired: number;
    deliveryRequired: boolean;
    buyerProtectionDays: number;
  };

  // Release timeline
  orderPlacedAt: Date;
  deliveryConfirmedAt?: Date;
  buyerProtectionExpiresAt?: Date;
  scheduledReleaseTime?: Date; // When release is scheduled to happen
  actualReleasedAt?: Date; // When funds actually hit seller wallet

  // Status tracking
  status: FundReleaseStatus;
  trigger?: FundReleaseTrigger;

  // Release conditions met?
  conditionsMet: {
    paymentCleared: boolean;
    paymentClearedAt?: Date;

    verificationComplete: boolean;

    deliveryConfirmed: boolean;
    deliveryConfirmedAt?: Date;

    buyerProtectionExpired: boolean;
    buyerProtectionExpiresAt?: Date;

    noActiveDisputes: boolean;
    noActiveReturns: boolean;

    noChargebacks: boolean;
  };

  // High-risk flags
  riskIndicators?: {
    isHighRiskStore: boolean;
    isNewStore: boolean;
    isHighValueOrder: boolean;
    hasMultipleReturns: boolean;
    flags: string[]; // ["high_refund_rate", "new_payment_method", etc]
  };

  // Notes & audit
  notes?: string;
  adminNotes?: string;
  metadata?: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fund Release Schema
 */
const FundReleaseSchema = new Schema<IFundRelease>(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    subOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },

    settlement: {
      amount: { type: Number },
      shippingPrice: { type: Number },
      commission: { type: Number },
      appliedPercentageFee: { type: Number },
      appliedFlatFee: { type: Number },
      notes: { type: String },
    },

    releaseRules: {
      verificationStatus: {
        type: String,
        enum: Object.values(StoreVerificationStatusEnumUsedByFundRelease),
        required: true,
      },
      storeTier: {
        type: String,
        enum: Object.values(StoreTierEnum),
        required: true,
      },
      businessDaysRequired: { type: Number, required: true },
      deliveryRequired: { type: Boolean, default: true },
      buyerProtectionDays: { type: Number, required: false }, // For my MVP, this is optional as we progress, we can make it required
      // buyerProtectionDays: { type: Number, required: true },
    },

    orderPlacedAt: { type: Date, required: true },
    deliveryConfirmedAt: Date,
    buyerProtectionExpiresAt: Date,
    scheduledReleaseTime: Date,
    actualReleasedAt: Date,

    status: {
      type: String,
      enum: Object.values(FundReleaseStatus),
      default: FundReleaseStatus.Pending,
      index: true,
    },
    trigger: {
      type: String,
      enum: Object.values(FundReleaseTrigger),
    },

    conditionsMet: {
      paymentCleared: { type: Boolean, default: false },
      paymentClearedAt: Date,

      verificationComplete: { type: Boolean, default: false },

      deliveryConfirmed: { type: Boolean, default: false },
      deliveryConfirmedAt: Date,

      buyerProtectionExpired: { type: Boolean, default: false },
      buyerProtectionExpiresAt: Date,

      noActiveDisputes: { type: Boolean, default: true },
      noActiveReturns: { type: Boolean, default: true },

      noChargebacks: { type: Boolean, default: true },
    },

    riskIndicators: {
      isHighRiskStore: { type: Boolean, default: false },
      isNewStore: { type: Boolean, default: false },
      isHighValueOrder: { type: Boolean, default: false },
      hasMultipleReturns: { type: Boolean, default: false },
      flags: [String],
    },

    notes: String,
    adminNotes: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Indexes for efficient querying
FundReleaseSchema.index({ storeId: 1, status: 1 });
FundReleaseSchema.index({ orderId: 1, subOrderId: 1 });
FundReleaseSchema.index({ scheduledReleaseTime: 1, status: 1 });
FundReleaseSchema.index({ actualReleasedAt: 1 });

/**
 * Get the FundRelease model
 */
export async function getFundReleaseModel(): Promise<Model<IFundRelease>> {
  await connectToDatabase();
  return (
    (mongoose.models.FundRelease as Model<IFundRelease>) ||
    mongoose.model<IFundRelease>("FundRelease", FundReleaseSchema)
  );
}

/**
 * Find fund releases ready to be released
 */
export async function getFundReleasesReadyToRelease(
  limit = 100
): Promise<IFundRelease[]> {
  await connectToDatabase();
  const FundRelease = await getFundReleaseModel();

  return FundRelease.find({
    status: FundReleaseStatus.Ready,
    scheduledReleaseTime: { $lte: new Date() },
  })
    .sort({ scheduledReleaseTime: 1 })
    .limit(limit);
}

/**
 * Find all pending fund releases for a store
 */
export async function getPendingFundReleasesByStore(
  storeId: string
): Promise<IFundRelease[]> {
  await connectToDatabase();
  const FundRelease = await getFundReleaseModel();

  return FundRelease.find({
    storeId,
    status: { $in: [FundReleaseStatus.Pending, FundReleaseStatus.Ready] },
  }).sort({ scheduledReleaseTime: 1 });
}
