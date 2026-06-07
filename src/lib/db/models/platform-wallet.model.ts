import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";

/**
 * Represents the platform's accumulated revenue breakdown.
 * All values are in Kobo (1 Naira = 100 Kobo).
 */
export interface IPlatformWalletBalances {
  commission: number; // Revenue accumulated from vendor sale commissions
  penalties: number; // Revenue accumulated from vendor dispute penalties
  total: number; // commission + penalties
}

/**
 * Platform wallet document interface.
 *
 * This is a singleton document — there is only ever one platform wallet.
 * It accumulates all platform revenue from commissions and penalties
 * across every transaction on the marketplace.
 */
export interface IPlatformWallet {
  _id: mongoose.Types.ObjectId;
  balances: IPlatformWalletBalances;
  currency: string; // Always "NGN" — explicit for future scalability
  createdAt: Date;
  updatedAt: Date;
}

export type IPlatformWalletDocument = IPlatformWallet & Document;

const PlatformWalletSchema = new Schema<IPlatformWalletDocument>(
  {
    balances: {
      commission: {
        type: Number,
        default: 0,
      },
      penalties: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        default: 0,
      },
    },
    currency: {
      type: String,
      default: "NGN",
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Get the PlatformWallet model.
 * Uses a cached model if available to prevent model redefinition during development.
 *
 * @returns Mongoose PlatformWallet model
 */
export async function getPlatformWalletModel(): Promise<
  Model<IPlatformWalletDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.PlatformWallet as Model<IPlatformWalletDocument>) ||
    mongoose.model<IPlatformWalletDocument>(
      "PlatformWallet",
      PlatformWalletSchema,
    )
  );
}

/**
 * Get the platform wallet.
 * Since this is a singleton, this always returns the one platform wallet document.
 *
 * @returns Platform wallet document or null if not yet initialised
 */
export async function getPlatformWallet(): Promise<IPlatformWallet | null> {
  await connectToDatabase();
  const PlatformWallet = await getPlatformWalletModel();

  return PlatformWallet.findOne().lean<IPlatformWallet>();
}

/**
 * Initialise the platform wallet.
 * Should be called once during platform setup. Subsequent calls are safe —
 * the function checks for an existing wallet before creating one.
 *
 * @returns The existing or newly created platform wallet document
 */
export async function initialisePlatformWallet(): Promise<IPlatformWallet> {
  await connectToDatabase();
  const PlatformWallet = await getPlatformWalletModel();

  const existing = await PlatformWallet.findOne<IPlatformWallet>();
  if (existing) return existing;

  const wallet = new PlatformWallet({});
  return await wallet.save();
}

/**
 * Credit the platform wallet with commission revenue from a settled suborder.
 * Called immediately after a student's payment is confirmed and the
 * commission is calculated for each suborder.
 *
 * @param commissionInKobo - Commission amount to credit in Kobo
 * @returns Updated platform wallet document or null
 */
export async function creditPlatformCommission(
  commissionInKobo: number,
  session?: mongoose.ClientSession | null,
): Promise<IPlatformWallet | null> {
  await connectToDatabase();
  const PlatformWallet = await getPlatformWalletModel();

  return PlatformWallet.findOneAndUpdate<IPlatformWallet>(
    {},
    {
      $inc: {
        "balances.commission": commissionInKobo,
        "balances.total": commissionInKobo,
      },
    },
    { new: true, session },
  );
}

/**
 * Credit the platform wallet with penalty revenue from an upheld dispute.
 * Called when a dispute is upheld and a penalty is successfully deducted
 * from the vendor's wallet.
 *
 * @param penaltyInKobo - Penalty amount to credit in Kobo
 * @returns Updated platform wallet document or null
 */
export async function creditPlatformPenalty(
  penaltyInKobo: number,
): Promise<IPlatformWallet | null> {
  await connectToDatabase();
  const PlatformWallet = await getPlatformWalletModel();

  return PlatformWallet.findOneAndUpdate<IPlatformWallet>(
    {},
    {
      $inc: {
        "balances.penalties": penaltyInKobo,
        "balances.total": penaltyInKobo,
      },
    },
    { new: true },
  );
}
