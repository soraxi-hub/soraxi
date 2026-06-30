import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import { RefundStatus, RefundTrigger } from "@/enums/financial.enums";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Monetary snapshot for a refund.
 * All values are in Kobo.
 */
export interface IRefundAmountBreakdown {
  /**
   * Amount refunded to the customer in Kobo.
   *
   * ORDER_CANCELLED  → amountPaid (settle + commission)
   * FAILED_DELIVERY  → settleAmount only (commission kept by platform)
   * DISPUTE_UPHELD   → amountPaid (settle + commission)
   */
  amountRefunded: number;

  /**
   * The vendor's net settle amount for the suborder, in Kobo.
   * Always present — used by all three trigger types.
   */
  settleAmount: number;

  /**
   * Platform commission on this suborder, in Kobo.
   * Present and reversed for ORDER_CANCELLED and DISPUTE_UPHELD.
   * Present but NOT reversed for FAILED_DELIVERY (kept by Soraxi).
   */
  commission: number;
}

/**
 * RefundRecord document interface.
 *
 * Created every time a refund is triggered, regardless of whether it goes
 * through the automated Flutterwave path or the manual admin path.
 * Tracks the full lifecycle from initiation through Flutterwave confirmation.
 */
export interface IRefundRecord {
  _id?: mongoose.Types.ObjectId;

  /** The suborder this refund relates to. */
  suborderId: mongoose.Types.ObjectId;

  /** The parent order. */
  orderId: mongoose.Types.ObjectId;

  /** The vendor whose funds are being reversed. */
  vendorId: mongoose.Types.ObjectId;

  /** The customer receiving the refund. */
  customerId: mongoose.Types.ObjectId;

  /** What triggered this refund. Enum-driven for loose coupling. */
  trigger: RefundTrigger;

  /** Financial breakdown — snapshot at time of refund initiation. */
  amountBreakdown: IRefundAmountBreakdown;

  /**
   * The Flutterwave transaction ID from the original payment.
   * This is the `id` (numeric) from the TransactionRecord, used as the
   * target for the Flutterwave refund API call.
   */
  flutterwaveTransactionId: string;

  /**
   * The Flutterwave refund ID returned after calling /v3/transactions/:id/refund.
   * Populated once the automated API call succeeds or the admin pastes it manually.
   * Null until then.
   */
  flutterwaveRefundId?: string;

  /** Internal lifecycle status of this refund attempt. */
  status: RefundStatus;

  /**
   * For manual refunds: the Flutterwave reference the admin pastes after
   * executing the refund on the Flutterwave dashboard.
   * Distinct from flutterwaveRefundId — this is what the admin copies.
   */
  manualReference?: string;

  /** Populated when status is FAILED. */
  failureReason?: string;

  /** Reference to the journal entry that opened the refund liability. */
  ledgerEntryId: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type IRefundRecordDocument = IRefundRecord & Document;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const RefundAmountBreakdownSchema = new Schema<IRefundAmountBreakdown>(
  {
    amountRefunded: {
      type: Number,
      required: true,
      min: 1,
    },
    settleAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    commission: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const RefundRecordSchema = new Schema<IRefundRecordDocument>(
  {
    suborderId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trigger: {
      type: String,
      required: true,
      enum: Object.values(RefundTrigger),
      index: true,
    },
    amountBreakdown: {
      type: RefundAmountBreakdownSchema,
      required: true,
    },
    flutterwaveTransactionId: {
      type: String,
      required: true,
    },
    flutterwaveRefundId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(RefundStatus),
      default: RefundStatus.INITIATED,
      index: true,
    },
    manualReference: {
      type: String,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    ledgerEntryId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index: look up all refunds for a vendor efficiently
RefundRecordSchema.index({ vendorId: 1, createdAt: -1 });

// Compound index: look up all refunds on a specific suborder
// Partial unique: only one non-failed refund per suborder at a time
RefundRecordSchema.index(
  { suborderId: 1, status: 1 },
  {
    partialFilterExpression: {
      status: { $in: [RefundStatus.INITIATED, RefundStatus.COMPLETED] },
    },
  },
);

// ---------------------------------------------------------------------------
// Model accessor
// ---------------------------------------------------------------------------

export async function getRefundRecordModel(): Promise<
  Model<IRefundRecordDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.RefundRecord as Model<IRefundRecordDocument>) ||
    mongoose.model<IRefundRecordDocument>("RefundRecord", RefundRecordSchema)
  );
}

// ---------------------------------------------------------------------------
// Model functions
// ---------------------------------------------------------------------------

/**
 * Create a new refund record when a refund is triggered.
 */
export async function createRefundRecord(
  data: Omit<IRefundRecord, "createdAt" | "updatedAt">,
  session: mongoose.ClientSession,
): Promise<IRefundRecordDocument> {
  await connectToDatabase();
  const RefundRecord = await getRefundRecordModel();

  const record = new RefundRecord(data);
  return await record.save({ session });
}

/**
 * Get a refund record by its ID.
 */
export async function getRefundRecordById(
  id: string,
): Promise<IRefundRecordDocument | null> {
  await connectToDatabase();
  const RefundRecord = await getRefundRecordModel();
  return RefundRecord.findById<IRefundRecordDocument>(id);
}

/**
 * Get a refund record by Flutterwave refund ID.
 * Used when processing Flutterwave refund webhook events.
 */
export async function getRefundRecordByFlutterwaveRefundId(
  flutterwaveRefundId: string,
): Promise<IRefundRecordDocument | null> {
  await connectToDatabase();
  const RefundRecord = await getRefundRecordModel();
  return RefundRecord.findOne<IRefundRecordDocument>({ flutterwaveRefundId });
}

/**
 * Get all INITIATED refund records.
 * Used by the admin panel to surface refunds awaiting manual execution.
 */
export async function getInitiatedRefundRecords(): Promise<
  IRefundRecordDocument[]
> {
  await connectToDatabase();
  const RefundRecord = await getRefundRecordModel();
  return RefundRecord.find<IRefundRecordDocument>({
    status: RefundStatus.INITIATED,
  }).sort({ createdAt: 1 }); // Oldest first — fair FIFO ordering
}

/**
 * Mark a refund as completed.
 * Called when Flutterwave confirms the refund or an admin confirms it manually.
 */
export async function markRefundCompleted(
  refundId: string,
  flutterwaveRefundId: string,
  session: mongoose.ClientSession,
): Promise<IRefundRecordDocument | null> {
  await connectToDatabase();
  const RefundRecord = await getRefundRecordModel();

  return RefundRecord.findByIdAndUpdate<IRefundRecordDocument>(
    refundId,
    {
      $set: {
        status: RefundStatus.COMPLETED,
        flutterwaveRefundId,
      },
    },
    { new: true, session },
  );
}

/**
 * Mark a refund as failed and record the reason.
 */
export async function markRefundFailed(
  refundId: string,
  failureReason: string,
  session: mongoose.ClientSession,
): Promise<IRefundRecordDocument | null> {
  await connectToDatabase();
  const RefundRecord = await getRefundRecordModel();

  return RefundRecord.findByIdAndUpdate<IRefundRecordDocument>(
    refundId,
    {
      $set: {
        status: RefundStatus.FAILED,
        failureReason,
      },
    },
    { new: true, session },
  );
}
