import mongoose, { Schema, Document, Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

export enum WalletTransactionSource {
  Order = "order",
  Withdrawal = "withdrawal",
  Refund = "refund",
  Adjustment = "adjustment",
}

export enum WalletTransactionType {
  Credit = "credit",
  Debit = "debit",
}

/**
 * The values for the fields here start with capital letter because it is used to reference MongoDB schemas
 */
export enum WalletTransactionRelatedDocumentType {
  Order = "Order",
  WithdrawalRequest = "WithdrawalRequest",
  Refund = "Refund",
  Adjustment = "Adjustment",
}

/**
 * Wallet Interface - represents a store's wallet account
 */
export interface IWallet extends Document {
  storeId: mongoose.Schema.Types.ObjectId;
  balance: number;
  pending: number;
  totalEarned: number;
  currency: string;
  updatedAt: Date;
  createdAt: Date;
}

/**
 * Wallet Transaction Interface - represents a single wallet entry (credit or debit)
 */
export interface IWalletTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  walletId: mongoose.Schema.Types.ObjectId;
  type: WalletTransactionType;
  amount: number;
  source: WalletTransactionSource;
  description?: string;
  relatedDocumentType?: WalletTransactionRelatedDocumentType;
  relatedDocumentId?: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
}

// Wallet Schema
const WalletSchema = new Schema<IWallet>(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
      index: true,
    },
    balance: { type: Number, default: 0 }, // in kobo
    pending: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    currency: { type: String, default: "NGN" },
  },
  { timestamps: true }
);

// Wallet Transaction Schema
const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(WalletTransactionType),
      required: true,
    },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: Object.values(WalletTransactionSource),
      required: true,
    },
    description: { type: String },
    relatedDocumentType: {
      type: String,
      enum: Object.values(WalletTransactionRelatedDocumentType),
    },
    relatedDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedDocumentType",
    },
  },
  { timestamps: true }
);

// Model getters
export async function getWalletModel(): Promise<Model<IWallet>> {
  await connectToDatabase();
  return (
    (mongoose.models.Wallet as Model<IWallet>) ||
    mongoose.model<IWallet>("Wallet", WalletSchema)
  );
}

export async function getWalletTransactionModel(): Promise<
  Model<IWalletTransaction>
> {
  await connectToDatabase();
  return (
    (mongoose.models.WalletTransaction as Model<IWalletTransaction>) ||
    mongoose.model<IWalletTransaction>(
      "WalletTransaction",
      WalletTransactionSchema
    )
  );
}
