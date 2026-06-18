import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  DisputeStatus,
  DisputeOutcome,
  DisputeResolvedBy,
} from "@/enums/financial.enums";

/**
 * Dispute record document interface.
 *
 * A dispute record is created when a customer raises a complaint against
 * a suborder. It manages the full lifecycle of the dispute — from evidence
 * collection through to resolution and financial outcome.
 *
 * Disputes operate at the suborder level. One suborder can only have
 * one active dispute at a time.
 *
 * Financial impact:
 * - On open: vendor's settle amount is frozen in their disputed balance
 * - On upheld: frozen funds are removed, customer is refunded, vendor is penalised
 * - On rejected: frozen funds are released back to vendor's available balance
 * - On auto-resolved: same as upheld but no penalty is applied to the vendor
 */
export interface IDisputeRecord {
  // What is being disputed
  suborderId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;

  // Who is involved
  customerId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;

  // Dispute evidence submitted by the customer
  reason: string; // Detailed written description of the complaint
  evidence: string[]; // Array of image URLs submitted as proof

  status: DisputeStatus;
  outcome?: DisputeOutcome; // Null until the dispute is resolved

  // Financial impact — all values in Kobo
  frozenAmount: number; // The suborder settle amount frozen on dispute open
  penaltyAmount: number; // Penalty applied to vendor — 0 if not upheld

  // Timeline
  openedAt: Date;
  deadline: Date; // openedAt + 5 business days
  warningIssuedAt?: Date; // Populated when day-4 warning alert is sent
  resolvedAt?: Date;

  // Resolution details — populated on resolution
  resolvedBy?: DisputeResolvedBy;
  resolutionNotes?: string;

  // Additional evidence request — used when outcome is INCONCLUSIVE
  additionalEvidenceRequestedAt?: Date;
  additionalEvidenceDeadline?: Date; // additionalEvidenceRequestedAt + 48 hours
  additionalEvidence?: string[]; // Extra image URLs submitted by customer

  createdAt: Date;
  updatedAt: Date;
}

export type IDisputeRecordDocument = IDisputeRecord & Document;

const DisputeRecordSchema = new Schema<IDisputeRecordDocument>(
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
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    evidence: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message:
          "At least one piece of evidence is required to open a dispute.",
      },
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index: true,
    },
    outcome: {
      type: String,
      enum: [...Object.values(DisputeOutcome), null],
      default: null,
    },
    frozenAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    penaltyAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    openedAt: {
      type: Date,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
      index: true, // Indexed for efficient background job queries
    },
    warningIssuedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: String,
      enum: [...Object.values(DisputeResolvedBy), null],
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: null,
    },
    additionalEvidenceRequestedAt: {
      type: Date,
      default: null,
    },
    additionalEvidenceDeadline: {
      type: Date,
      default: null,
    },
    additionalEvidence: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Ensure a suborder can only have one active dispute at a time
DisputeRecordSchema.index(
  { suborderId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [DisputeStatus.OPEN, DisputeStatus.AWAITING_EVIDENCE] },
    },
  },
);

// Compound index for background job querying disputes approaching their deadline
DisputeRecordSchema.index({ status: 1, deadline: 1 });

/**
 * Get the DisputeRecord model.
 * Uses a cached model if available to prevent model redefinition during development.
 *
 * @returns Mongoose DisputeRecord model
 */
export async function getDisputeRecordModel(): Promise<
  Model<IDisputeRecordDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.DisputeRecord as Model<IDisputeRecordDocument>) ||
    mongoose.model<IDisputeRecordDocument>("DisputeRecord", DisputeRecordSchema)
  );
}

/**
 * Create a new dispute record when a customer opens a dispute.
 *
 * @param data - Dispute record data
 * @returns The created dispute record document
 */
export async function createDisputeRecord(
  data: Omit<IDisputeRecord, "createdAt" | "updatedAt">,
  session: mongoose.ClientSession,
): Promise<IDisputeRecordDocument> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  const record = new DisputeRecord(data);
  return await record.save({ session });
}

/**
 * Get a dispute record by its ID.
 *
 * @param id - The _id of the dispute record
 * @returns Dispute record document or null
 */
export async function getDisputeRecordById(
  id: string,
): Promise<IDisputeRecordDocument | null> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  return DisputeRecord.findById<IDisputeRecordDocument>(id);
}

/**
 * Get the active dispute for a specific suborder, if one exists.
 *
 * @param suborderId - The _id of the suborder
 * @returns Active dispute record or null
 */
export async function getActiveDisputeBySuborderId(
  suborderId: string,
): Promise<IDisputeRecordDocument | null> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  return DisputeRecord.findOne<IDisputeRecordDocument>({
    suborderId,
    status: { $in: [DisputeStatus.OPEN, DisputeStatus.AWAITING_EVIDENCE] },
  });
}

/**
 * Get all open disputes — used by the platform team's dispute management dashboard.
 * Returns disputes in ascending deadline order so the most urgent appear first.
 *
 * @returns Array of open dispute records
 */
export async function getOpenDisputes(): Promise<IDisputeRecord[]> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  return DisputeRecord.find<IDisputeRecord>({
    status: { $in: [DisputeStatus.OPEN, DisputeStatus.AWAITING_EVIDENCE] },
  }).sort({ deadline: 1 });
}

/**
 * Get all disputes that have passed their deadline without resolution.
 * Used by the background job that triggers auto-resolution.
 *
 * @returns Array of overdue unresolved dispute records
 */
export async function getOverdueDisputes(): Promise<IDisputeRecordDocument[]> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  return DisputeRecord.find<IDisputeRecordDocument>({
    status: { $in: [DisputeStatus.OPEN, DisputeStatus.AWAITING_EVIDENCE] },
    deadline: { $lte: new Date() },
  });
}

/**
 * Get all disputes approaching their deadline within the next 24 hours.
 * Used by the background job that sends day-4 warning alerts to the platform team.
 *
 * @returns Array of dispute records approaching their deadline
 */
export async function getDisputesApproachingDeadline(): Promise<
  IDisputeRecord[]
> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return DisputeRecord.find<IDisputeRecord>({
    status: { $in: [DisputeStatus.OPEN, DisputeStatus.AWAITING_EVIDENCE] },
    deadline: { $gte: now, $lte: in24Hours },
    warningIssuedAt: null, // Only fetch disputes where warning has not yet been sent
  });
}

/**
 * Mark a dispute's day-4 warning as sent.
 *
 * @param id - The _id of the dispute record
 * @returns Updated dispute record document or null
 */
export async function markDisputeWarningSent(
  id: string,
): Promise<IDisputeRecord | null> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  return DisputeRecord.findByIdAndUpdate<IDisputeRecord>(
    id,
    { $set: { warningIssuedAt: new Date() } },
    { new: true },
  );
}

/**
 * Request additional evidence from the customer when a dispute is inconclusive.
 * Sets the status to AWAITING_EVIDENCE and records the 48-hour response deadline.
 *
 * @param id - The _id of the dispute record
 * @returns Updated dispute record document or null
 */
export async function requestAdditionalEvidence(
  id: string,
): Promise<IDisputeRecord | null> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  const now = new Date();
  const deadline48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  return DisputeRecord.findByIdAndUpdate<IDisputeRecord>(
    id,
    {
      $set: {
        status: DisputeStatus.AWAITING_EVIDENCE,
        outcome: DisputeOutcome.INCONCLUSIVE,
        additionalEvidenceRequestedAt: now,
        additionalEvidenceDeadline: deadline48h,
      },
    },
    { new: true },
  );
}

/**
 * Submit additional evidence from the customer in response to an evidence request.
 *
 * @param id - The _id of the dispute record
 * @param additionalEvidence - Array of new image URLs submitted by the customer
 * @returns Updated dispute record document or null
 */
export async function submitAdditionalEvidence(
  id: string,
  additionalEvidence: string[],
): Promise<IDisputeRecord | null> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  return DisputeRecord.findByIdAndUpdate<IDisputeRecord>(
    id,
    {
      $set: {
        additionalEvidence,
        status: DisputeStatus.OPEN, // Move back to OPEN for re-evaluation
      },
    },
    { new: true },
  );
}

/**
 * Resolve a dispute with a final outcome.
 * Used for both manual resolution by the platform team and
 * automatic resolution by the background job.
 *
 * @param id - The _id of the dispute record
 * @param outcome - The final outcome of the dispute
 * @param resolvedBy - Whether resolved by team or system
 * @param penaltyAmount - Penalty applied in Kobo — 0 if not upheld
 * @param resolutionNotes - Optional notes from the resolver
 * @returns Updated dispute record document or null
 */
export async function resolveDisputeRecord(
  id: string,
  outcome: DisputeOutcome,
  resolvedBy: DisputeResolvedBy,
  penaltyAmount = 0,
  session: mongoose.ClientSession,
  resolutionNotes?: string,
): Promise<IDisputeRecord | null> {
  await connectToDatabase();
  const DisputeRecord = await getDisputeRecordModel();

  const status =
    resolvedBy === DisputeResolvedBy.SYSTEM
      ? DisputeStatus.AUTO_RESOLVED
      : DisputeStatus.RESOLVED;

  return DisputeRecord.findByIdAndUpdate<IDisputeRecord>(
    id,
    {
      $set: {
        status,
        outcome,
        penaltyAmount,
        resolvedAt: new Date(),
        resolvedBy,
        ...(resolutionNotes && { resolutionNotes }),
      },
    },
    { new: true, session },
  );
}
