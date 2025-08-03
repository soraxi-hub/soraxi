import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * Interface for Bank Details snapshot at the time of withdrawal request
 */
export interface IWithdrawalBankDetails {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  bankCode: number;
}

/**
 * Interface for a Withdrawal Request Document
 */
export interface IWithdrawalRequest extends Document {
  _id: mongoose.Types.ObjectId;
  store: mongoose.Types.ObjectId; // Reference to the store making the request
  requestNumber: string; // Unique identifier for the request (e.g., WDR-ABC12345)

  // Financial details of the request
  requestedAmount: number; // Amount requested by the store (in kobo)
  processingFee: number; // Calculated processing fee (in kobo)
  netAmount: number; // Amount after fees (in kobo)

  // Bank details snapshot at the time of request
  bankDetails: IWithdrawalBankDetails;

  // Status and timestamps
  status:
    | "pending"
    | "under_review"
    | "approved"
    | "processing"
    | "completed"
    | "rejected"
    | "failed";
  statusHistory: Array<{
    status:
      | "pending"
      | "under_review"
      | "approved"
      | "processing"
      | "completed"
      | "rejected"
      | "failed";
    timestamp: Date;
    adminId?: mongoose.Types.ObjectId;
    notes?: string;
  }>;

  // Admin review and processing details
  reviewedBy?: mongoose.Types.ObjectId; // Admin who reviewed the request
  reviewedAt?: Date;
  reviewNotes?: string; // Notes from admin review
  rejectionReason?: string; // Reason if the request was rejected

  processedBy?: mongoose.Types.ObjectId; // Admin who processed the payout
  processedAt?: Date;
  transactionReference?: string; // Reference from the payment gateway

  // Store-provided details
  description?: string; // Optional description from the store

  // Audit trail
  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Define Withdrawal Request Schema
 */
const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    requestNumber: {
      type: String,
      required: true,
      unique: true,
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    processingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    bankDetails: {
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      accountHolderName: { type: String, required: true },
      bankCode: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "under_review",
        "approved",
        "processing",
        "completed",
        "rejected",
        "failed",
      ],
      default: "pending",
      required: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "pending",
            "under_review",
            "approved",
            "processing",
            "completed",
            "rejected",
            "failed",
          ],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
        notes: String,
      },
    ],
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    reviewedAt: Date,
    reviewNotes: String,
    rejectionReason: String,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    processedAt: Date,
    transactionReference: String,
    description: String,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

/**
 * Get the WithdrawalRequest model
 */
export async function getWithdrawalRequestModel(): Promise<
  Model<IWithdrawalRequest>
> {
  await connectToDatabase();
  return (
    (mongoose.models.WithdrawalRequest as Model<IWithdrawalRequest>) ||
    mongoose.model<IWithdrawalRequest>(
      "WithdrawalRequest",
      WithdrawalRequestSchema
    )
  );
}
