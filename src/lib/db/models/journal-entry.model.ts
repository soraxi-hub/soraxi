import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  LedgerEntryCategory,
  LedgerReferenceType,
} from "@/enums/financial.enums";

/**
 * A journal entry is the atomic unit of a financial event in Soraxi's
 * double-entry accounting system.
 *
 * Each journal entry groups two or more ledger lines that together represent
 * one balanced financial event — the sum of all CREDIT lines within a journal
 * entry must equal the sum of all DEBIT lines.
 *
 * Journal entries are immutable — they are never updated or deleted after
 * creation. All audit trails and financial reconciliations depend on this
 * guarantee.
 */
export interface IJournalEntry {
  _id: mongoose.Types.ObjectId;

  /** The financial event category that triggered this journal entry. */
  category: LedgerEntryCategory;

  /** The type of document that triggered this journal entry. */
  referenceType: LedgerReferenceType;

  /** The _id of the document that triggered this journal entry. */
  referenceId: mongoose.Types.ObjectId;

  /** Human-readable description of the financial event. */
  description: string;

  /** Extra context for traceability (e.g. Flutterwave reference, order ID). */
  metadata?: Record<string, unknown>;

  /** Set once on creation — never updated (immutability safeguard). */
  createdAt: Date;
}

export type IJournalEntryDocument = IJournalEntry & Document;

/**
 * Mongoose schema for journal entries.
 *
 * Important: This schema intentionally omits `updatedAt` via timestamps config.
 * Journal entries are immutable — they must never be modified after creation.
 */
const JournalEntrySchema = new Schema<IJournalEntryDocument>(
  {
    category: {
      type: String,
      required: true,
      enum: Object.values(LedgerEntryCategory),
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

// Compound index for fetching all journal entries for a specific reference document
JournalEntrySchema.index({ referenceId: 1, referenceType: 1 });

/**
 * Get the JournalEntry model.
 * Uses a cached model if available to prevent model redefinition during development.
 *
 * @returns Mongoose JournalEntry model
 */
export async function getJournalEntryModel(): Promise<
  Model<IJournalEntryDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.JournalEntry as Model<IJournalEntryDocument>) ||
    mongoose.model<IJournalEntryDocument>("JournalEntry", JournalEntrySchema)
  );
}

/**
 * Create a new immutable journal entry.
 *
 * This function is intentionally not exported for direct use outside of
 * `JournalEntryWriter`. All journal entry creation must go through the writer
 * service to ensure the double-entry invariant is enforced before any DB write.
 *
 * @param data - The journal entry data (excluding createdAt)
 * @param session - MongoDB client session for transaction support
 * @returns The created journal entry document
 */
export async function createJournalEntry(
  data: Omit<IJournalEntry, "_id" | "createdAt">,
  session: mongoose.ClientSession,
): Promise<IJournalEntryDocument> {
  await connectToDatabase();
  const JournalEntry = await getJournalEntryModel();

  const entry = new JournalEntry(data);
  return await entry.save({ session });
}

/**
 * Get a journal entry by its ID.
 *
 * @param id - The _id of the journal entry
 * @returns The journal entry document, or null if not found
 */
export async function getJournalEntryById(
  id: string,
): Promise<IJournalEntry | null> {
  await connectToDatabase();
  const JournalEntry = await getJournalEntryModel();

  return JournalEntry.findById<IJournalEntry>(id);
}

/**
 * Get all journal entries triggered by a specific reference document.
 * Returns entries in reverse chronological order.
 *
 * Useful for reconstructing the full financial history of a suborder,
 * dispute, or payout.
 *
 * @param referenceId - The _id of the triggering document
 * @param referenceType - The type of the triggering document
 * @returns Array of journal entries
 */
export async function getJournalEntriesByReference(
  referenceId: string,
  referenceType: LedgerReferenceType,
): Promise<IJournalEntry[]> {
  await connectToDatabase();
  const JournalEntry = await getJournalEntryModel();

  return JournalEntry.find<IJournalEntry>({
    referenceId: new mongoose.Types.ObjectId(referenceId),
    referenceType,
  }).sort({ createdAt: -1 });
}
