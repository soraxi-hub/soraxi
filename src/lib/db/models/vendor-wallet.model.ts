import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { DebtRecoveryType } from "@/enums/financial.enums";

/**
 * Result of applying upheld-dispute deductions to a vendor wallet.
 */
export interface IDisputeUpheldDeductionResult {
  wallet: IVendorWallet;
  /**
   * Portion of the penalty drawn from available balance.
   * The caller passes this to writeDisputeUpheld so the ledger split matches
   * the wallet split. The remainder (penaltyAmount - penaltyFromAvailable)
   * became new debt.
   */
  penaltyFromAvailable: number;
}

/**
 * Represents the breakdown of a vendor's wallet balance across all states.
 * All values are in Kobo (1 Naira = 100 Kobo).
 */
export interface IVendorWalletBalances {
  available: number; // Funds the vendor can withdraw right now
  pending: number; // Funds held awaiting order confirmation
  disputed: number; // Funds frozen due to one or more open disputes
  total: number; // available + pending + disputed
}

/**
 * Represents an outstanding debt owed by a vendor to the platform.
 * Debt arises when a penalty is applied and the vendor's wallet has
 * insufficient funds to cover it, causing the balance to go negative.
 */
export interface IVendorWalletDebt {
  amount: number; // Amount owed to platform in Kobo
  recoveryType: DebtRecoveryType; // How the debt is being recovered
  recoveryPercentage: number; // % deducted per payout — only used when PERCENTAGE_DEDUCTION
}

/**
 * Vendor wallet document interface.
 *
 * Each vendor has exactly one wallet. It is not a real bank account —
 * it tracks what the vendor is owed on the platform across all balance states.
 *
 * Balances are maintained as a running state updated alongside every
 * ledger entry. The ledger remains the source of truth for auditing,
 * but the wallet enables fast balance reads without expensive aggregations.
 */
export interface IVendorWallet {
  _id?: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  balances: IVendorWalletBalances;
  debt: IVendorWalletDebt;
  currency: string; // Always "NGN" — explicit for future scalability
  createdAt: Date;
  updatedAt: Date;
}

export type IVendorWalletDocument = IVendorWallet & Document;

const VendorWalletSchema = new Schema<IVendorWalletDocument>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      unique: true,
      index: true,
    },
    balances: {
      available: {
        type: Number,
        default: 0,
      },
      pending: {
        type: Number,
        default: 0,
      },
      disputed: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        default: 0,
      },
    },
    debt: {
      amount: {
        type: Number,
        default: 0,
      },
      recoveryType: {
        type: String,
        enum: [...Object.values(DebtRecoveryType), null],
        default: null,
      },
      recoveryPercentage: {
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
 * Get the VendorWallet model.
 * Uses a cached model if available to prevent model redefinition during development.
 *
 * @returns Mongoose VendorWallet model
 */
export async function getVendorWalletModel(): Promise<
  Model<IVendorWalletDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.VendorWallet as Model<IVendorWalletDocument>) ||
    mongoose.model<IVendorWalletDocument>("VendorWallet", VendorWalletSchema)
  );
}

/**
 * Create a new vendor wallet with zero balances.
 * Should be called once when a vendor account is created.
 *
 * @param vendorId - The _id of the vendor
 * @returns The created vendor wallet document
 */
export async function createVendorWallet(
  vendorId: string,
  session: mongoose.ClientSession,
): Promise<IVendorWalletDocument> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  const wallet = new VendorWallet({ vendorId });
  return await wallet.save({ session });
}

/**
 * Get a vendor's wallet by vendor ID.
 *
 * @param vendorId - The _id of the vendor
 * @returns Vendor wallet document or null
 */
export async function getVendorWalletByVendorId(
  vendorId: string,
): Promise<IVendorWalletDocument | null> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  return VendorWallet.findOne<IVendorWalletDocument>({ vendorId });
}

/**
 * Credit a vendor's pending balance.
 * Called when a customer's payment is confirmed and the vendor's
 * settle amount is allocated — funds sit in pending until order confirmation.
 *
 * @param vendorId - The _id of the vendor
 * @param amountInKobo - Amount to credit in Kobo
 * @returns Updated vendor wallet document or null
 */
export async function creditVendorPendingBalance(
  vendorId: string,
  amountInKobo: number,
  session: mongoose.ClientSession,
): Promise<IVendorWallet | null> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  return VendorWallet.findOneAndUpdate<IVendorWallet>(
    { vendorId },
    {
      $inc: {
        "balances.pending": amountInKobo,
        "balances.total": amountInKobo,
      },
    },
    { new: true, session },
  );
}

/**
 * Move funds from pending to available balance.
 * Called when an order is confirmed — either by the customer or via auto-confirm.
 *
 * @param vendorId - The _id of the vendor
 * @param amountInKobo - Amount to move in Kobo
 * @returns Updated vendor wallet document or null
 */
export async function releaseVendorPendingToAvailable(
  vendorId: string,
  amountInKobo: number,
  session: mongoose.ClientSession,
): Promise<IVendorWallet | null> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  return VendorWallet.findOneAndUpdate<IVendorWallet>(
    { vendorId },
    {
      $inc: {
        "balances.pending": -amountInKobo,
        "balances.available": amountInKobo,
      },
    },
    { new: true, session },
  );
}

/**
 * Move funds from available to disputed balance.
 * Called when a customer opens a dispute on a suborder.
 *
 * @param vendorId - The _id of the vendor
 * @param amountInKobo - Amount to freeze in Kobo
 * @returns Updated vendor wallet document or null
 */
export async function freezeVendorFunds(
  vendorId: string,
  amountInKobo: number,
  session: mongoose.ClientSession,
): Promise<IVendorWallet | null> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  return VendorWallet.findOneAndUpdate<IVendorWallet>(
    { vendorId },
    {
      $inc: {
        "balances.available": -amountInKobo,
        "balances.disputed": amountInKobo,
      },
    },
    { new: true, session },
  );
}

/**
 * Move funds from disputed back to available balance.
 * Called when a dispute is rejected — funds are returned to the vendor.
 *
 * @param vendorId - The _id of the vendor
 * @param amountInKobo - Amount to release in Kobo
 * @returns Updated vendor wallet document or null
 */
export async function releaseVendorDisputedToAvailable(
  vendorId: string,
  amountInKobo: number,
  session: mongoose.ClientSession,
): Promise<IVendorWallet | null> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  return VendorWallet.findOneAndUpdate<IVendorWallet>(
    { vendorId },
    {
      $inc: {
        "balances.disputed": -amountInKobo,
        "balances.available": amountInKobo,
      },
    },
    { new: true, session },
  );
}

/**
 * Apply the wallet-side effects of an upheld dispute.
 *
 * Removes the frozen amount from disputed, then splits the penalty so available
 * never goes below zero: the covered portion (min of available and penalty)
 * leaves available, and any shortfall accumulates onto debt.amount via $inc.
 * Recovery policy is sticky: recoveryType/recoveryPercentage are set only when
 * no policy is already in force (recoveryType is null).
 *
 * Computes and returns penaltyFromAvailable so the caller can keep the ledger
 * entry's penalty split identical to the wallet's. Must be called before the
 * writer so the caller has that figure.
 *
 * @param vendorId - The _id of the vendor
 * @param frozenAmountInKobo - The disputed amount to remove
 * @param penaltyAmountInKobo - The penalty to apply (0 for no-penalty paths)
 * @param debtRecoveryType - Recovery strategy, set only if no policy exists yet
 * @param recoveryPercentage - % per payout, set only if no policy exists yet
 * @param session - MongoDB client session
 * @returns The updated wallet and the penaltyFromAvailable split, or null if no wallet
 */
export async function applyDisputeUpheldDeductions(
  vendorId: string,
  frozenAmountInKobo: number,
  penaltyAmountInKobo: number,
  debtRecoveryType: DebtRecoveryType,
  recoveryPercentage: number,
  session: mongoose.ClientSession,
): Promise<IDisputeUpheldDeductionResult | null> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  const wallet = await VendorWallet.findOne({ vendorId }).session(session);
  if (!wallet) return null;

  const available = wallet.balances.available;

  // Clamp: never let available go below zero. The covered portion is whatever
  // available can absorb; the rest becomes new debt.
  const penaltyFromAvailable = Math.min(available, penaltyAmountInKobo);
  const penaltyToDebt = penaltyAmountInKobo - penaltyFromAvailable;

  // Sticky policy: only set recovery fields when no policy is already in force.
  const hasExistingPolicy = wallet.debt.recoveryType != null;
  const shouldSetPolicy = penaltyToDebt > 0 && !hasExistingPolicy;

  const updated = await VendorWallet.findOneAndUpdate<IVendorWallet>(
    { vendorId },
    {
      $inc: {
        "balances.available": -penaltyFromAvailable,
        "balances.disputed": -frozenAmountInKobo,
        "balances.total": -(frozenAmountInKobo + penaltyFromAvailable),
        "debt.amount": penaltyToDebt,
      },
      ...(shouldSetPolicy && {
        $set: {
          "debt.recoveryType": debtRecoveryType,
          "debt.recoveryPercentage": recoveryPercentage,
        },
      }),
    },
    { new: true, session },
  );

  if (!updated) return null;

  return { wallet: updated, penaltyFromAvailable };
}

/**
 * Deduct an amount from the vendor's available balance for a payout.
 * Called when a vendor initiates a withdrawal request.
 *
 * @param vendorId - The _id of the vendor
 * @param amountInKobo - Amount to deduct in Kobo
 * @returns Updated vendor wallet document or null
 */
export async function deductVendorAvailableForPayout(
  vendorId: string,
  amountInKobo: number,
  session: mongoose.ClientSession,
): Promise<IVendorWallet | null> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  return VendorWallet.findOneAndUpdate<IVendorWallet>(
    { vendorId },
    {
      $inc: {
        "balances.available": -amountInKobo,
        "balances.total": -amountInKobo,
      },
    },
    { new: true, session },
  );
}

/**
 * Reverse a payout deduction — restore funds to available balance.
 * Called when a Flutterwave transfer fails after the balance was already deducted.
 *
 * @param vendorId - The _id of the vendor
 * @param amountInKobo - Amount to restore in Kobo
 * @returns Updated vendor wallet document or null
 */
export async function reverseVendorPayoutDeduction(
  vendorId: string,
  amountInKobo: number,
  session: mongoose.ClientSession,
): Promise<IVendorWallet | null> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  return VendorWallet.findOneAndUpdate<IVendorWallet>(
    { vendorId },
    {
      $inc: {
        "balances.available": amountInKobo,
        "balances.total": amountInKobo,
      },
    },
    { new: true, session },
  );
}

/**
 * Reduce the vendor's recorded debt after a recovery deduction.
 * Called after each successful partial debt recovery via percentage deduction.
 *
 * @param vendorId - The _id of the vendor
 * @param recoveredAmountInKobo - Amount recovered in Kobo
 * @returns Updated vendor wallet document or null
 */
export async function reduceVendorDebt(
  vendorId: string,
  recoveredAmountInKobo: number,
  session: mongoose.ClientSession,
): Promise<IVendorWallet | null> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  const wallet = await VendorWallet.findOne({ vendorId }).session(session);
  if (!wallet) return null;

  const remainingDebt = wallet.debt.amount - recoveredAmountInKobo;
  const isDebtCleared = remainingDebt <= 0;

  return VendorWallet.findOneAndUpdate<IVendorWallet>(
    { vendorId },
    {
      $set: {
        "debt.amount": isDebtCleared ? 0 : remainingDebt,
        ...(isDebtCleared && {
          "debt.recoveryType": null,
          "debt.recoveryPercentage": 0,
        }),
      },
    },
    { new: true, session },
  );
}
