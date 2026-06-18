import mongoose, { Schema, type Document, type Model } from "mongoose";
import { connectToDatabase } from "../mongoose";
import {
  LedgerEntryType,
  LedgerAccountType,
  LedgerEntityType,
} from "@/enums/financial.enums";

/**
 * A ledger line represents one side of a journal entry in Soraxi's
 * double-entry accounting system.
 *
 * Every journal entry must have exactly two or more ledger lines. The sum of
 * all CREDIT lines within a journal entry must equal the sum of all DEBIT
 * lines — this invariant is enforced by `JournalEntryWriter` before any DB
 * write occurs.
 *
 * Ledger lines are immutable — they are never updated or deleted after
 * creation.
 */
export interface ILedgerLine {
  _id: mongoose.Types.ObjectId;

  /** Foreign key linking this line to its parent JournalEntry document. */
  journalId: mongoose.Types.ObjectId;

  /** Whether this line is a CREDIT or a DEBIT. */
  type: LedgerEntryType;

  /** Which account in the chart of accounts is affected by this line. */
  accountType: LedgerAccountType;

  /**
   * The _id of the affected vendor or customer.
   * Only present for lines where accountType is a VENDOR_* or CUSTOMER_* account.
   * Omitted for platform-level accounts (PLATFORM_ESCROW, PLATFORM_REVENUE_*, etc.).
   */
  entityId?: mongoose.Types.ObjectId;

  /**
   * The entity type corresponding to entityId.
   * Only present when entityId is set.
   */
  entityType?: LedgerEntityType;

  /**
   * The monetary amount affected, in Kobo (1 Naira = 100 Kobo).
   * Must always be a positive integer — zero-amount lines are never valid.
   */
  amount: number;

  /** Set once on creation — never updated (immutability safeguard). */
  createdAt: Date;
}

export type ILedgerLineDocument = ILedgerLine & Document;

/**
 * Mongoose schema for ledger lines.
 *
 * Important: This schema intentionally omits `updatedAt` via timestamps config.
 * Ledger lines are immutable — they must never be modified after creation.
 */
const LedgerLineSchema = new Schema<ILedgerLineDocument>(
  {
    journalId: {
      type: Schema.Types.ObjectId,
      ref: "JournalEntry",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(LedgerEntryType),
    },
    accountType: {
      type: String,
      required: true,
      enum: Object.values(LedgerAccountType),
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: false,
      // Sparse index — only indexed when present (vendor/customer lines only)
      index: { sparse: true },
    },
    entityType: {
      type: String,
      required: false,
      enum: [...Object.values(LedgerEntityType), null],
    },
    amount: {
      type: Number,
      required: true,
      // Zero-amount lines are never valid in a double-entry system
      min: 1,
    },
  },
  {
    // Only track createdAt — updatedAt is intentionally excluded to enforce immutability
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Compound index for wallet reconciliation — fetching all lines for a specific
// entity and account type across a date range without a full collection scan
LedgerLineSchema.index({ entityId: 1, accountType: 1, createdAt: -1 });

/**
 * Get the LedgerLine model.
 * Uses a cached model if available to prevent model redefinition during development.
 *
 * @returns Mongoose LedgerLine model
 */
export async function getLedgerLineModel(): Promise<
  Model<ILedgerLineDocument>
> {
  await connectToDatabase();

  return (
    (mongoose.models.LedgerLine as Model<ILedgerLineDocument>) ||
    mongoose.model<ILedgerLineDocument>("LedgerLine", LedgerLineSchema)
  );
}

/**
 * Create multiple ledger lines atomically within a MongoDB session.
 *
 * This function is intentionally not exported for direct use outside of
 * `JournalEntryWriter`. All ledger line creation must go through the writer
 * service to ensure the double-entry invariant is enforced before any DB write.
 *
 * Always requires a session — writing multiple ledger lines outside of a
 * transaction is never safe.
 *
 * @param lines - Array of ledger line data (excluding _id and createdAt)
 * @param session - MongoDB client session (required — never omit)
 * @returns Array of created ledger line documents
 */
export async function createLedgerLines(
  lines: Omit<ILedgerLine, "_id" | "createdAt">[],
  session: mongoose.ClientSession,
): Promise<ILedgerLineDocument[]> {
  await connectToDatabase();
  const LedgerLine = await getLedgerLineModel();

  return LedgerLine.insertMany(lines, { session });
}

/**
 * Get all ledger lines belonging to a specific journal entry.
 * Returns lines in insertion order (oldest first).
 *
 * @param journalId - The _id of the parent journal entry
 * @returns Array of ledger line documents
 */
export async function getLedgerLinesByJournalId(
  journalId: string,
): Promise<ILedgerLine[]> {
  await connectToDatabase();
  const LedgerLine = await getLedgerLineModel();

  return LedgerLine.find<ILedgerLine>({
    journalId: new mongoose.Types.ObjectId(journalId),
  }).sort({ createdAt: 1 });
}

/**
 * Get all ledger lines for a specific entity (vendor or customer),
 * optionally filtered by account type.
 *
 * Returns lines in reverse chronological order. Used for reconstructing
 * an entity's financial history and for wallet reconciliation.
 *
 * @param entityId - The _id of the vendor or customer
 * @param accountType - Optional filter to a specific account type
 * @returns Array of ledger line documents
 */
export async function getLedgerLinesByEntityId(
  entityId: string,
  accountType?: LedgerAccountType,
): Promise<ILedgerLine[]> {
  await connectToDatabase();
  const LedgerLine = await getLedgerLineModel();

  const query: Record<string, unknown> = {
    entityId: new mongoose.Types.ObjectId(entityId),
  };

  if (accountType !== undefined) {
    query.accountType = accountType;
  }

  return LedgerLine.find<ILedgerLine>(query).sort({ createdAt: -1 });
}

/**
 * Get all ledger lines for a specific account type, optionally scoped to a
 * date range.
 *
 * Used for platform-level BI queries (e.g. total commission earned, total
 * gateway fees, total refunds issued) without scanning the full collection.
 *
 * @param accountType - The account type to filter by
 * @param dateFrom - Optional start of date range (inclusive)
 * @param dateTo - Optional end of date range (inclusive)
 * @returns Array of ledger line documents
 */
export async function getLedgerLinesByAccountType(
  accountType: LedgerAccountType,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<ILedgerLine[]> {
  await connectToDatabase();
  const LedgerLine = await getLedgerLineModel();

  const query: Record<string, unknown> = { accountType };

  if (dateFrom !== undefined || dateTo !== undefined) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom !== undefined) dateFilter.$gte = dateFrom;
    if (dateTo !== undefined) dateFilter.$lte = dateTo;
    query.createdAt = dateFilter;
  }

  return LedgerLine.find<ILedgerLine>(query).sort({ createdAt: -1 });
}
