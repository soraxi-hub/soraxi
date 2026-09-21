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
  _id: mongoose.Types.ObjectId;

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
