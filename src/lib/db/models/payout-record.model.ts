import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  PayoutStatus,
  FlutterwaveTransferStatus,
} from "@/enums/financial.enums";

/**
 * NOTE: Vendor as used here represent a `STORE`.
 */

/**
 * Vendor bank account details captured at the time of a payout request.
 * Stored as a snapshot so historical payouts remain accurate even if
 * the vendor later updates their bank details.
 */
export interface IPayoutBankDetails {
  bankCode: string; // Flutterwave bank code
  accountNumber: string; // Vendor's bank account number
  accountName: string; // Vendor's bank account name (as verified)
}

/**
 * Monetary breakdown for a payout transaction.
 *
 * Stores a complete financial snapshot of the withdrawal at the time
 * it was initiated, including debt recovery deductions, processing fees,
 * gateway costs, and the final amount transferred to the vendor.
 *
 * All amounts are stored in Kobo to avoid floating-point precision issues.
 */
export interface IPayoutAmountBreakdown {
  /**
   * Total amount requested by the vendor for withdrawal.
   *
   * This is the amount deducted from the vendor's available balance.
   */
  requestedAmount: number;

  /**
   * Amount recovered from the vendor's outstanding debt as part of
   * this payout request.
   *
   * This amount is withheld before payout fees are calculated.
   */
  debtRecoveryDeductionAmount: number;

  /**
   * Vendor's outstanding debt balance immediately before debt recovery
   * was applied for this payout.
   */
  debtBeforeRecovery?: number;

  /**
   * Vendor's outstanding debt balance immediately after debt recovery
   * was applied for this payout.
   */
  debtAfterRecovery?: number;

  /**
   * Percentage used to calculate the debt recovery deduction.
   *
   * Stored as a snapshot because platform recovery settings may change
   * over time.
   *
   * Example:
   * 15 = 15%
   */
  debtRecoveryPercentage?: number;

  /**
   * Fixed component of the processing fee charged for this payout.
   *
   * Stored separately for auditing and historical fee analysis.
   */
  fixedProcessingFee: number;

  /**
   * Percentage-based component of the processing fee charged for
   * this payout.
   *
   * Stored separately for auditing and historical fee analysis.
   */
  percentageProcessingFee: number;

  /**
   * Total processing fee charged for this payout.
   *
   * Formula:
   * processingFee = fixedProcessingFee + percentageProcessingFee
   */
  processingFee: number;

  /**
   * Fee charged by the payment gateway for executing the transfer.
   *
   * This is optional because some gateways may not expose transfer fees,
   * or the platform may choose to absorb them instead of attributing them
   * to individual payouts.
   */
  gatewayFee?: number;

  /**
   * Final amount transferred to the vendor after debt recovery and
   * processing fees have been deducted.
   *
   * Formula:
   * netAmount =
   *   requestedAmount -
   *   debtRecoveryDeductionAmount -
   *   processingFee
   */
  netAmount: number;
}

/**
 * Payout record document interface.
 *
 * A payout record is created every time a vendor initiates a withdrawal.
 * It tracks the full lifecycle of the transfer from initiation through
 * to Flutterwave confirmation — whether successful or failed.
 *
 * Failed payouts are fully reversed — the deducted amount is restored
 * to the vendor's available balance.
 */
export interface IPayoutRecord {
  _id?: mongoose.Types.ObjectId;

  /**
   * `vendorId` refers to the storeId this subOrder is assiociated with
   */
  vendorId: mongoose.Types.ObjectId;

  amountBreakdown: IPayoutAmountBreakdown;

  // Snapshot of bank details at time of payout — never updated after creation
  bankDetails: IPayoutBankDetails;

  // Flutterwave transfer details — populated after transfer is initiated
  flutterwaveTransferId?: string;
  flutterwaveStatus?: FlutterwaveTransferStatus;

  status: PayoutStatus;

  // Reference to the ledger entry created when payout was initiated
  ledgerEntryId: mongoose.Types.ObjectId;

  // Populated only when status is FAILED
  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type IPayoutRecordDocument = IPayoutRecord & Document;

const PayoutBankDetailsSchema = new Schema<IPayoutBankDetails>(
  {
    bankCode: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const PayoutAmountBreakdownSchema = new Schema<IPayoutAmountBreakdown>(
  {
    requestedAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    debtRecoveryDeductionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    debtBeforeRecovery: {
      type: Number,
      required: false,
      min: 0,
    },
    debtAfterRecovery: {
      type: Number,
      required: false,
      min: 0,
    },
    debtRecoveryPercentage: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    fixedProcessingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    percentageProcessingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    processingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    gatewayFee: {
      type: Number,
      required: false,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const PayoutRecordSchema = new Schema<IPayoutRecordDocument>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    amountBreakdown: {
      type: PayoutAmountBreakdownSchema,
      required: true,
    },
    bankDetails: {
      type: PayoutBankDetailsSchema,
      required: true,
    },
    flutterwaveTransferId: {
      type: String,
      default: null,
      index: true,
    },
    flutterwaveStatus: {
      type: String,
      enum: [...Object.values(FlutterwaveTransferStatus), null],
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(PayoutStatus),
      default: PayoutStatus.INITIATED,
      index: true,
    },
    ledgerEntryId: {
      type: Schema.Types.ObjectId,
      ref: "LedgerEntry",
      required: true,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for fetching a vendor's payout history efficiently
PayoutRecordSchema.index({ vendorId: 1, createdAt: -1 });

/**
 * Get the PayoutRecord model.
 * Uses a cached model if available to prevent model redefinition during development.
 *
 * @returns Mongoose PayoutRecord model
 */
export async function getPayoutRecordModel(): Promise<
  Model<IPayoutRecordDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.PayoutRecord as Model<IPayoutRecordDocument>) ||
    mongoose.model<IPayoutRecordDocument>("PayoutRecord", PayoutRecordSchema)
  );
}

/**
 * Create a new payout record when a vendor initiates a withdrawal.
 *
 * @param data - Payout record data
 * @returns The created payout record document
 */
export async function createPayoutRecord(
  data: Omit<IPayoutRecord, "createdAt" | "updatedAt">,
  session: mongoose.ClientSession,
): Promise<IPayoutRecordDocument> {
  await connectToDatabase();
  const PayoutRecord = await getPayoutRecordModel();

  const record = new PayoutRecord(data);
  return await record.save({ session });
}

/**
 * Get a payout record by its ID.
 *
 * @param id - The _id of the payout record
 * @returns Payout record document or null
 */
export async function getPayoutRecordById(
  id: string,
): Promise<IPayoutRecordDocument | null> {
  await connectToDatabase();
  const PayoutRecord = await getPayoutRecordModel();

  return PayoutRecord.findById<IPayoutRecordDocument>(id);
}

/**
 * Get a payout record by Flutterwave transfer ID.
 * Primarily used when processing Flutterwave transfer webhooks.
 *
 * @param flutterwaveTransferId - The Flutterwave transfer ID
 * @returns Payout record document or null
 */
export async function getPayoutRecordByFlutterwaveTransferId(
  flutterwaveTransferId: string,
): Promise<IPayoutRecordDocument | null> {
  await connectToDatabase();
  const PayoutRecord = await getPayoutRecordModel();

  return PayoutRecord.findOne<IPayoutRecordDocument>({ flutterwaveTransferId });
}

/**
 * Get all payout records for a specific vendor.
 * Returns records in reverse chronological order.
 *
 * @param vendorId - The _id of the vendor
 * @returns Array of payout record documents
 */
export async function getPayoutRecordsByVendorId(
  vendorId: string,
): Promise<IPayoutRecordDocument[]> {
  await connectToDatabase();
  const PayoutRecord = await getPayoutRecordModel();

  return PayoutRecord.find<IPayoutRecordDocument>({
    vendorId: new mongoose.Types.ObjectId(vendorId),
  }).sort({
    createdAt: -1,
  });
}

/**
 * Update the Flutterwave transfer details after initiating a transfer.
 * Called immediately after the Flutterwave Transfer API responds.
 *
 * @param id - The _id of the payout record
 * @param flutterwaveTransferId - The transfer ID returned by Flutterwave
 * @returns Updated payout record document or null
 */
export async function updatePayoutFlutterwaveTransferId(
  id: string,
  flutterwaveTransferId: string,
  session: mongoose.ClientSession,
): Promise<IPayoutRecordDocument | null> {
  await connectToDatabase();
  const PayoutRecord = await getPayoutRecordModel();

  return PayoutRecord.findByIdAndUpdate<IPayoutRecordDocument>(
    id,
    {
      $set: {
        flutterwaveTransferId,
        status: PayoutStatus.PROCESSING,
      },
    },
    { new: true, session },
  );
}

/**
 * Mark a payout as successfully completed.
 * Called when Flutterwave's webhook confirms a successful transfer.
 *
 * @param flutterwaveTransferId - The Flutterwave transfer ID
 * @returns Updated payout record document or null
 */
export async function markPayoutCompleted(
  flutterwaveTransferId: string,
  session: mongoose.ClientSession,
): Promise<IPayoutRecordDocument | null> {
  await connectToDatabase();
  const PayoutRecord = await getPayoutRecordModel();

  return PayoutRecord.findOneAndUpdate<IPayoutRecordDocument>(
    { flutterwaveTransferId },
    {
      $set: {
        status: PayoutStatus.COMPLETED,
        flutterwaveStatus: FlutterwaveTransferStatus.SUCCESSFUL,
      },
    },
    { new: true, session },
  );
}

/**
 * Mark a payout as failed and record the reason.
 * Called when Flutterwave's webhook confirms a failed transfer.
 * The caller is responsible for reversing the wallet deduction separately.
 *
 * @param flutterwaveTransferId - The Flutterwave transfer ID
 * @param failureReason - Human-readable reason for the failure
 * @returns Updated payout record document or null
 */
export async function markPayoutFailed(
  flutterwaveTransferId: string,
  failureReason: string,
  session: mongoose.ClientSession,
): Promise<IPayoutRecordDocument | null> {
  await connectToDatabase();
  const PayoutRecord = await getPayoutRecordModel();

  return PayoutRecord.findOneAndUpdate<IPayoutRecordDocument>(
    { flutterwaveTransferId },
    {
      $set: {
        status: PayoutStatus.FAILED,
        flutterwaveStatus: FlutterwaveTransferStatus.FAILED,
        failureReason,
      },
    },
    { new: true, session },
  );
}
