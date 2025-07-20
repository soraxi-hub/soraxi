import mongoose, { Schema, Document, Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * Wallet Interface - represents a store's wallet account
 */
export interface IWallet extends Document {
  store: mongoose.Schema.Types.ObjectId;
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
  wallet: mongoose.Schema.Types.ObjectId;
  type: "credit" | "debit";
  amount: number;
  source: "order" | "withdrawal" | "refund" | "adjustment";
  description?: string;
  relatedOrderId?: mongoose.Schema.Types.ObjectId;
  createdAt: Date;
}

// Wallet Schema
const WalletSchema = new Schema<IWallet>(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
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
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: ["order", "withdrawal", "refund", "adjustment"],
      required: true,
    },
    description: { type: String },
    relatedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
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
