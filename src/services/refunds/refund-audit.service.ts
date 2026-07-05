import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  RefundTrigger,
  LedgerEntryCategory,
  LedgerReferenceType,
} from "@/enums/financial.enums";
import {
  getRefundRecordModel,
  type IRefundRecordDocument,
} from "@/lib/db/models/refund-record.model";
import {
  getJournalEntryModel,
  type IJournalEntry,
} from "@/lib/db/models/journal-entry.model";
import {
  getLedgerLineModel,
  type ILedgerLine,
} from "@/lib/db/models/ledger-line.model";

// ---------------------------------------------------------------------------
// Why this module exists
// ---------------------------------------------------------------------------
//
// A refund's money movement is recorded as TWO journal entries, written at
// different times by different services:
//
//   1. OPENING entry  — creates the CUSTOMER_REFUND_PAYABLE liability
//                        (the platform now owes the student money back).
//   2. CLOSING entry   — REFUND_CONFIRMED, closes that liability once the
//                        money has physically left the platform to the student.
//
// An auditor holding a RefundRecord needs to walk to both. This resolver is
// the single place that knows how to do that walk. It is READ-ONLY — the
// JournalEntryWriter remains the only thing that ever writes to the ledger.
//
// ---------------------------------------------------------------------------
// Why the opening lookup needs BOTH the reference pair AND the category
// ---------------------------------------------------------------------------
//
// The ledger keys every entry on a (referenceType, referenceId) pair, and the
// RefundRecord stores that same pair in (ledgerReferenceType, ledgerReferenceId)
// so we can find the opening entry. But the pair alone is only unambiguous for
// cancellation and failed-delivery refunds, where the opening entry is keyed on
// (REFUND, refundId) and nothing else shares that key.
//
// For dispute refunds the opening entry is keyed on (DISPUTE, disputeId), and a
// single dispute produces SEVERAL entries under that same key over its life:
// funds held when the dispute opens (FUNDS_HELD), then the resolution entry
// (REFUND_ISSUED for upheld/auto-resolved, or FUNDS_RELEASED if rejected).
// Querying by (DISPUTE, disputeId) alone would return multiple entries and we
// could not tell which one opened the refund liability.
//
// So the resolver also matches on the entry CATEGORY. The category that opened
// the liability is fixed per trigger (see openingCategoryForTrigger below), so
// (referenceType, referenceId, category) resolves to exactly one opening entry
// for every trigger type. This is the reason the mapping function exists rather
// than a plain findOne on the pair.
//
// ---------------------------------------------------------------------------
// Why the closing entry is derived, not stored
// ---------------------------------------------------------------------------
//
// The closing REFUND_CONFIRMED entry is ALWAYS keyed on (REFUND, refundRecord._id)
// regardless of what triggered the refund, because writeRefundConfirmed is called
// with the RefundRecord's own _id for every trigger. So there is nothing to store:
// the closing key is the record's own id. Do not "simplify" this into a single
// stored reference shared with the opening entry — for disputes the opening entry
// is a dispute-keyed entry that ALSO carries the penalty and fund-freeze lines,
// so it cannot be re-keyed to the refund without lying about what it records.
// The open/close asymmetry is intentional and load-bearing.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A journal entry paired with its ledger lines. */
export interface IRefundJournalEntry {
  entry: IJournalEntry;
  lines: ILedgerLine[];
}

/** The full two-legged audit trail for a single refund. */
export interface IRefundAuditTrail {
  refundId: string;
  trigger: RefundTrigger;

  /** The (referenceType, referenceId) pair the opening entry is keyed on. */
  ledgerReference: {
    type: LedgerReferenceType;
    id: string;
  };

  /**
   * The entry that opened this refund's CUSTOMER_REFUND_PAYABLE liability.
   * Expected to always resolve; null indicates a data-integrity problem
   * (a refund whose opening ledger entry cannot be found) worth alerting on.
   */
  opening: IRefundJournalEntry | null;

  /**
   * The REFUND_CONFIRMED entry that closed the liability.
   * Null while the refund is still INITIATED (not yet confirmed by Flutterwave
   * or the admin), which is a normal in-flight state, not an error.
   */
  closing: IRefundJournalEntry | null;
}

// ---------------------------------------------------------------------------
// Trigger -> opening category mapping
// ---------------------------------------------------------------------------

/**
 * The journal category that OPENS the refund liability for a given trigger.
 *
 * DISPUTE_UPHELD and DISPUTE_AUTO_RESOLVED both map to REFUND_ISSUED because
 * writeDisputeUpheld and writeDisputeAutoResolved both commit under that
 * category.
 */
function openingCategoryForTrigger(
  trigger: RefundTrigger,
): LedgerEntryCategory {
  switch (trigger) {
    case RefundTrigger.ORDER_CANCELLED:
      return LedgerEntryCategory.ORDER_CANCELLATION_REFUND;
    case RefundTrigger.FAILED_DELIVERY:
      return LedgerEntryCategory.FAILED_DELIVERY_REFUND;
    case RefundTrigger.DISPUTE_UPHELD:
    case RefundTrigger.DISPUTE_AUTO_RESOLVED:
      return LedgerEntryCategory.REFUND_ISSUED;
    default: {
      // Exhaustiveness guard: if a new RefundTrigger is added, this line fails
      // to compile until the mapping above is updated.
      const _exhaustive: never = trigger;
      throw new Error(`Unhandled refund trigger: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

/**
 * Resolve the opening and closing journal entries (with their ledger lines)
 * for a refund record.
 *
 * @param refundRecord - The refund record to trace.
 * @returns The two-legged audit trail. `opening` should always be present;
 *          `closing` is null until the refund is confirmed.
 */
export async function resolveRefundAuditTrail(
  refundRecord: IRefundRecordDocument,
): Promise<IRefundAuditTrail> {
  await connectToDatabase();
  const JournalEntry = await getJournalEntryModel();
  const LedgerLine = await getLedgerLineModel();

  const refundObjectId = refundRecord._id as mongoose.Types.ObjectId;

  // Opening entry: keyed on the stored reference pair, disambiguated by the
  // category that opens the liability for this trigger (see module notes).
  const openingEntry = await JournalEntry.findOne<IJournalEntry>({
    referenceType: refundRecord.ledgerReferenceType,
    referenceId: refundRecord.ledgerReferenceId,
    category: openingCategoryForTrigger(refundRecord.trigger),
  });

  // Closing entry: always keyed on (REFUND, this refund's _id).
  const closingEntry = await JournalEntry.findOne<IJournalEntry>({
    referenceType: LedgerReferenceType.REFUND,
    referenceId: refundObjectId,
    category: LedgerEntryCategory.REFUND_CONFIRMED,
  });

  // Fetch the ledger lines for whichever entries were found. Lines are ordered
  // by creation so debits/credits read in the order the writer composed them.
  const [openingLines, closingLines] = await Promise.all([
    openingEntry
      ? LedgerLine.find<ILedgerLine>({ journalId: openingEntry._id }).sort({
          createdAt: 1,
        })
      : Promise.resolve<ILedgerLine[]>([]),
    closingEntry
      ? LedgerLine.find<ILedgerLine>({ journalId: closingEntry._id }).sort({
          createdAt: 1,
        })
      : Promise.resolve<ILedgerLine[]>([]),
  ]);

  return {
    refundId: refundObjectId.toString(),
    trigger: refundRecord.trigger,
    ledgerReference: {
      type: refundRecord.ledgerReferenceType,
      id: refundRecord.ledgerReferenceId.toString(),
    },
    opening: openingEntry ? { entry: openingEntry, lines: openingLines } : null,
    closing: closingEntry ? { entry: closingEntry, lines: closingLines } : null,
  };
}

/**
 * Convenience wrapper: load a refund record by id, then resolve its audit trail.
 *
 * @param refundId - The RefundRecord _id.
 * @returns The audit trail, or null if no refund record exists for that id.
 */
export async function resolveRefundAuditTrailById(
  refundId: string,
): Promise<IRefundAuditTrail | null> {
  await connectToDatabase();
  const RefundRecord = await getRefundRecordModel();

  const record = await RefundRecord.findById<IRefundRecordDocument>(refundId);
  if (!record) return null;

  return resolveRefundAuditTrail(record);
}
