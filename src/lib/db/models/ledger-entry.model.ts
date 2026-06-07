import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  LedgerEntryType,
  LedgerEntryCategory,
  LedgerEntityType,
  LedgerReferenceType,
} from "@/enums/financial.enums";

/**
 * Represents a single immutable entry in the financial ledger.
 *
 * The ledger is the single source of truth for all money movement on the
 * platform. Every balance change — in any wallet — is the result of one or
 * more ledger entries. Entries are never updated or deleted after creation.
 */
export interface ILedgerEntry {
  type: LedgerEntryType; // "CREDIT" or "DEBIT"
  category: LedgerEntryCategory; // The financial event that triggered this entry
  amount: number; // Always in Kobo (1 Naira = 100 Kobo)

  // Who is financially affected by this entry
  entityType: LedgerEntityType; // "VENDOR", "PLATFORM", or "CUSTOMER"
  entityId: mongoose.Types.ObjectId; // Reference to the affected entity's document

  // What triggered this entry
  referenceType: LedgerReferenceType; // "SUBORDER", "DISPUTE", "PAYOUT", or "PENALTY"
  referenceId: mongoose.Types.ObjectId; // _id of the document that triggered this entry

  description: string; // Human-readable summary of the entry

  // Extra context for traceability e.g. Flutterwave reference, dispute reason
  metadata?: Record<string, unknown>;

  createdAt: Date; // Set once on creation — never updated (immutability safeguard)
}

export type ILedgerEntryDocument = ILedgerEntry & Document;

/**
 * Mongoose schema for ledger entries.
 *
 * Important: This schema intentionally omits `updatedAt` via timestamps config.
 * Ledger entries are immutable — they must never be modified after creation.
 * All audit trails and balance reconciliations depend on this guarantee.
 */
const LedgerEntrySchema = new Schema<ILedgerEntryDocument>(
  {
    type: {
      type: String,
      required: true,
      enum: Object.values(LedgerEntryType),
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: Object.values(LedgerEntryCategory),
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    entityType: {
      type: String,
      required: true,
      enum: Object.values(LedgerEntityType),
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    referenceType: {
      type: String,
      required: true,
      enum: Object.values(LedgerReferenceType),
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // Only track createdAt — updatedAt is intentionally excluded to enforce immutability
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Compound index for fetching all ledger entries for a specific entity efficiently
LedgerEntrySchema.index({ entityId: 1, createdAt: -1 });

// Compound index for fetching all entries related to a specific reference document
LedgerEntrySchema.index({ referenceId: 1, referenceType: 1 });

/**
 * Get the LedgerEntry model.
 * Uses a cached model if available to prevent model redefinition during development.
 *
 * @returns Mongoose LedgerEntry model
 */
export async function getLedgerEntryModel(): Promise<
  Model<ILedgerEntryDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.LedgerEntry as Model<ILedgerEntryDocument>) ||
    mongoose.model<ILedgerEntryDocument>("LedgerEntry", LedgerEntrySchema)
  );
}

/**
 * Create a new immutable ledger entry.
 *
 * This is the only write operation permitted on the ledger.
 * Entries cannot be updated or deleted after creation.
 *
 * @param data - The ledger entry data
 * @returns The created ledger entry document
 */
export async function createLedgerEntry(
  data: Omit<ILedgerEntry, "createdAt">,
  session?: mongoose.ClientSession | null,
): Promise<ILedgerEntryDocument> {
  await connectToDatabase();
  const LedgerEntry = await getLedgerEntryModel();

  const entry = new LedgerEntry(data);
  return await entry.save({ session });
}

/**
 * Get all ledger entries for a specific entity (vendor, student, or platform).
 * Returns entries in reverse chronological order.
 *
 * @param entityId - The _id of the entity
 * @param entityType - The type of the entity
 * @returns Array of ledger entries
 */
export async function getLedgerEntriesByEntity(
  entityId: string,
  entityType: LedgerEntityType,
): Promise<ILedgerEntry[]> {
  await connectToDatabase();
  const LedgerEntry = await getLedgerEntryModel();

  return LedgerEntry.find<ILedgerEntry>({ entityId, entityType }).sort({
    createdAt: -1,
  });
}

/**
 * Get all ledger entries triggered by a specific reference document.
 * Useful for reconstructing the full financial history of a suborder,
 * dispute, or payout.
 *
 * @param referenceId - The _id of the triggering document
 * @param referenceType - The type of the triggering document
 * @returns Array of ledger entries
 */
export async function getLedgerEntriesByReference(
  referenceId: string,
  referenceType: LedgerReferenceType,
): Promise<ILedgerEntry[]> {
  await connectToDatabase();
  const LedgerEntry = await getLedgerEntryModel();

  return LedgerEntry.find<ILedgerEntry>({ referenceId, referenceType }).sort({
    createdAt: -1,
  });
}
