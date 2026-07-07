import mongoose, { type PipelineStage } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  LedgerEntryType,
  LedgerAccountType,
  LedgerReferenceType,
  LedgerEntryCategory,
} from "@/enums/financial.enums";
import { getLedgerLineModel } from "@/lib/db/models/ledger-line.model";
import { getJournalEntryModel } from "@/lib/db/models/journal-entry.model";
import {
  getVendorWalletModel,
  type IVendorWalletBalances,
} from "@/lib/db/models/vendor-wallet.model";
import {
  getPlatformWalletModel,
  type IPlatformWalletBalances,
} from "@/lib/db/models/platform-wallet.model";
import {
  getTransactionRecordModel,
  type ISuborderBreakdown,
} from "@/lib/db/models/transaction-record.model";

// ---------------------------------------------------------------------------
// Return types
// ---------------------------------------------------------------------------

export interface GlobalBalanceResult {
  /** Sum of all CREDIT ledger lines within the scoped date range, in Kobo. */
  totalCredits: number;
  /** Sum of all DEBIT ledger lines within the scoped date range, in Kobo. */
  totalDebits: number;
  /** True when totalCredits === totalDebits. */
  isBalanced: boolean;
  /** credits − debits; always 0 in a correctly balanced system. */
  delta: number;
}

export interface VendorWalletReconciliationResult {
  /** Balances currently stored in the VendorWallet document. */
  stored: IVendorWalletBalances;
  /** Balances derived by replaying all ledger lines for this vendor. */
  derived: IVendorWalletBalances;
  /** True when every bucket in stored matches the corresponding bucket in derived. */
  isBalanced: boolean;
  /**
   * Fields where stored !== derived.
   * An empty object means the wallet is fully reconciled.
   */
  discrepancies: Partial<IVendorWalletBalances>;
}

// ---------------------------------------------------------------------------
// Aggregation result shapes (internal)
// ---------------------------------------------------------------------------

interface TypeSumResult {
  _id: string; // LedgerEntryType value ("credit" | "debit")
  total: number;
}

interface AccountTypeSumResult {
  _id: {
    accountType: LedgerAccountType;
    type: string; // LedgerEntryType value
  };
  total: number;
}

// ---------------------------------------------------------------------------
// checkGlobalBalance
// ---------------------------------------------------------------------------

/**
 * Verify that the sum of all CREDIT ledger lines equals the sum of all DEBIT
 * ledger lines across the entire system (or within a date range).
 *
 * This is the fundamental invariant of double-entry accounting. A non-zero
 * delta indicates a data integrity problem — either a journal entry was
 * written without going through JournalEntryWriter, or a ledger line was
 * modified/deleted after creation.
 *
 * Scope queries to a date range when possible to avoid full-collection scans
 * on large datasets.
 *
 * @param dateFrom - Optional start of date range (inclusive)
 * @param dateTo - Optional end of date range (inclusive)
 * @returns Global balance summary including totalCredits, totalDebits, isBalanced, and delta
 */
export async function checkGlobalBalance(
  dateFrom?: Date,
  dateTo?: Date,
): Promise<GlobalBalanceResult> {
  await connectToDatabase();
  const LedgerLine = await getLedgerLineModel();

  const matchStage: Record<string, unknown> = {};

  if (dateFrom !== undefined || dateTo !== undefined) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom !== undefined) dateFilter.$gte = dateFrom;
    if (dateTo !== undefined) dateFilter.$lte = dateTo;
    matchStage.createdAt = dateFilter;
  }

  const pipeline = [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
      },
    },
  ];

  const results = await LedgerLine.aggregate<TypeSumResult>(pipeline);

  let totalCredits = 0;
  let totalDebits = 0;

  for (const row of results) {
    if (row._id === LedgerEntryType.CREDIT) {
      totalCredits = row.total;
    } else if (row._id === LedgerEntryType.DEBIT) {
      totalDebits = row.total;
    }
  }

  const delta = totalCredits - totalDebits;

  return {
    totalCredits,
    totalDebits,
    isBalanced: delta === 0,
    delta,
  };
}

// ---------------------------------------------------------------------------
// reconcileVendorWallet
// ---------------------------------------------------------------------------

/**
 * Reconstruct expected wallet balances for a vendor by replaying their ledger
 * lines, then diff the result against the stored VendorWallet document.
 *
 * Use this function to detect drift between the running-state wallet cache and
 * the immutable ledger — the authoritative source of truth.
 *
 * Account type → wallet bucket mapping:
 *
 * | accountType      | type   | Effect          |
 * |------------------|--------|-----------------|
 * | VENDOR_PENDING   | CREDIT | pending ↑       |
 * | VENDOR_PENDING   | DEBIT  | pending ↓       |
 * | VENDOR_AVAILABLE | CREDIT | available ↑     |
 * | VENDOR_AVAILABLE | DEBIT  | available ↓     |
 * | VENDOR_DISPUTED  | CREDIT | disputed ↑      |
 * | VENDOR_DISPUTED  | DEBIT  | disputed ↓      |
 *
 * `total` is derived as `available + pending + disputed`.
 *
 * @param vendorId - The _id of the vendor (as a string)
 * @returns Reconciliation result with stored, derived, isBalanced, and discrepancies
 * @throws {Error} If no VendorWallet document exists for the given vendorId
 */
export async function reconcileVendorWallet(
  vendorId: string,
): Promise<VendorWalletReconciliationResult> {
  await connectToDatabase();
  const LedgerLine = await getLedgerLineModel();
  const VendorWallet = await getVendorWalletModel();

  // Fetch the stored wallet
  const wallet = await VendorWallet.findOne({
    vendorId: new mongoose.Types.ObjectId(vendorId),
  }).lean<{ balances: IVendorWalletBalances }>();

  if (!wallet) {
    throw new Error(
      `reconcileVendorWallet: No VendorWallet found for vendorId "${vendorId}".`,
    );
  }

  const stored: IVendorWalletBalances = wallet.balances;

  // Aggregate all vendor ledger lines grouped by accountType and type
  const vendorAccountTypes = [
    LedgerAccountType.VENDOR_PENDING,
    LedgerAccountType.VENDOR_AVAILABLE,
    LedgerAccountType.VENDOR_DISPUTED,
  ];

  const pipeline = [
    {
      $match: {
        entityId: new mongoose.Types.ObjectId(vendorId),
        accountType: { $in: vendorAccountTypes },
      },
    },
    {
      $group: {
        _id: {
          accountType: "$accountType",
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
  ];

  const rows = await LedgerLine.aggregate<AccountTypeSumResult>(pipeline);

  // Build a lookup: accountType → { credit: number, debit: number }
  const sums: Record<string, { credit: number; debit: number }> = {
    [LedgerAccountType.VENDOR_PENDING]: { credit: 0, debit: 0 },
    [LedgerAccountType.VENDOR_AVAILABLE]: { credit: 0, debit: 0 },
    [LedgerAccountType.VENDOR_DISPUTED]: { credit: 0, debit: 0 },
  };

  for (const row of rows) {
    const { accountType, type } = row._id;
    if (!(accountType in sums)) continue;

    if (type === LedgerEntryType.CREDIT) {
      sums[accountType]!.credit += row.total;
    } else if (type === LedgerEntryType.DEBIT) {
      sums[accountType]!.debit += row.total;
    }
  }

  // Derive each wallet bucket: net = credit - debit
  const derivedPending =
    (sums[LedgerAccountType.VENDOR_PENDING]?.credit ?? 0) -
    (sums[LedgerAccountType.VENDOR_PENDING]?.debit ?? 0);

  const derivedAvailable =
    (sums[LedgerAccountType.VENDOR_AVAILABLE]?.credit ?? 0) -
    (sums[LedgerAccountType.VENDOR_AVAILABLE]?.debit ?? 0);

  const derivedDisputed =
    (sums[LedgerAccountType.VENDOR_DISPUTED]?.credit ?? 0) -
    (sums[LedgerAccountType.VENDOR_DISPUTED]?.debit ?? 0);

  const derived: IVendorWalletBalances = {
    available: derivedAvailable,
    pending: derivedPending,
    disputed: derivedDisputed,
    total: derivedAvailable + derivedPending + derivedDisputed,
  };

  // Diff stored vs derived
  const discrepancies: Partial<IVendorWalletBalances> = {};

  const buckets = ["available", "pending", "disputed", "total"] as const;

  for (const bucket of buckets) {
    if (stored[bucket] !== derived[bucket]) {
      discrepancies[bucket] = derived[bucket];
    }
  }

  return {
    stored,
    derived,
    isBalanced: Object.keys(discrepancies).length === 0,
    discrepancies,
  };
}

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

/**
 * Derive the net balance (credit − debit) of a single ledger account,
 * optionally scoped to an entity and/or date range.
 *
 * This is the building block reused by `reconcilePlatformWallet` and
 * `checkEscrowSolvency`. It performs a single indexed aggregation — cost is
 * bounded by the number of lines matching the account (and entity/date
 * filters, if given), not by total collection size.
 *
 * @param accountType - The ledger account to sum
 * @param options.entityId - Optional entity filter (vendor or customer _id)
 * @param options.dateFrom - Optional start of date range (inclusive)
 * @param options.dateTo - Optional end of date range (inclusive)
 * @returns credit total minus debit total, in Kobo
 */
/**
 * Derive the net balance of a single ledger account, optionally scoped to
 * an entity and/or date range.
 *
 * ACCOUNTING CONVENTION: not every account increases the same way.
 * All vendor accounts (VENDOR_PENDING, VENDOR_AVAILABLE, VENDOR_DISPUTED),
 * PLATFORM_REVENUE_*, PAYOUT_PROCESSING, and CUSTOMER_REFUND_PAYABLE are
 * liability/revenue-style: CREDIT increases, DEBIT decreases. This is now
 * consistent across every JournalEntryWriter method (the earlier Group A/B
 * split was corrected). PLATFORM_ESCROW and VENDOR_DEBT_RECEIVABLE are
 * asset-style: DEBIT increases, CREDIT decreases. PLATFORM_ESCROW is the
 * platform's cash; VENDOR_DEBT_RECEIVABLE is money vendors owe the platform.
 * Pass `increasesOn: "debit"` for those two; the default ("credit") is correct
 * for everything else.
 *
 * This is the building block reused by `reconcilePlatformWallet`,
 * `checkEscrowSolvency`, `checkLedgerAccountingIdentity`, and
 * `reconcileVendorDebt`. It performs a single indexed aggregation — cost is
 * bounded by the number of lines matching the account (and entity/date
 * filters, if given), not by total collection size.
 *
 * @param accountType - The ledger account to sum
 * @param options.entityId - Optional entity filter (vendor or customer _id)
 * @param options.dateFrom - Optional start of date range (inclusive)
 * @param options.dateTo - Optional end of date range (inclusive)
 * @param options.increasesOn - Which side increases this account's balance.
 *   Defaults to "credit" (liability/revenue convention).
 * @returns The account's net balance, signed so that a positive number
 *   always means "more of what this account represents", regardless of
 *   which side increases it.
 */
async function deriveLedgerAccountBalance(
  accountType: LedgerAccountType,
  options?: {
    entityId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    increasesOn?: "credit" | "debit";
  },
): Promise<number> {
  await connectToDatabase();
  const LedgerLine = await getLedgerLineModel();

  const matchStage: Record<string, unknown> = { accountType };

  if (options?.entityId !== undefined) {
    matchStage.entityId = new mongoose.Types.ObjectId(options.entityId);
  }

  if (options?.dateFrom !== undefined || options?.dateTo !== undefined) {
    const dateFilter: Record<string, Date> = {};
    if (options.dateFrom !== undefined) dateFilter.$gte = options.dateFrom;
    if (options.dateTo !== undefined) dateFilter.$lte = options.dateTo;
    matchStage.createdAt = dateFilter;
  }

  const pipeline = [
    { $match: matchStage },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ];

  const rows = await LedgerLine.aggregate<{ _id: string; total: number }>(
    pipeline,
  );

  let credit = 0;
  let debit = 0;
  for (const row of rows) {
    if (row._id === LedgerEntryType.CREDIT) credit = row.total;
    else if (row._id === LedgerEntryType.DEBIT) debit = row.total;
  }

  return options?.increasesOn === "debit" ? debit - credit : credit - debit;
}

// ---------------------------------------------------------------------------
// reconcilePlatformWallet
// ---------------------------------------------------------------------------

export interface PlatformWalletReconciliationResult {
  /** Balances currently stored in the PlatformWallet document. */
  stored: IPlatformWalletBalances;
  /** Balances derived by replaying PLATFORM_REVENUE_* ledger lines. */
  derived: IPlatformWalletBalances;
  isBalanced: boolean;
  discrepancies: Partial<IPlatformWalletBalances>;
}

/**
 * Reconstruct expected platform wallet balances by aggregating
 * PLATFORM_REVENUE_COMMISSION and PLATFORM_REVENUE_PENALTIES ledger lines,
 * and diff against the stored PlatformWallet singleton document.
 *
 * This closes the gap noted in FINANCIAL_ARCHITECTURE.md §16 — previously
 * only vendor wallets had an automated reconciliation check.
 *
 * @returns Reconciliation result with stored, derived, isBalanced, and discrepancies
 * @throws {Error} If the PlatformWallet has not been initialised
 */
export async function reconcilePlatformWallet(): Promise<PlatformWalletReconciliationResult> {
  await connectToDatabase();
  const PlatformWallet = await getPlatformWalletModel();

  const wallet = await PlatformWallet.findOne().lean<{
    balances: IPlatformWalletBalances;
  }>();

  if (!wallet) {
    throw new Error(
      "reconcilePlatformWallet: PlatformWallet has not been initialised.",
    );
  }

  const stored = wallet.balances;

  const [commission, penalties] = await Promise.all([
    deriveLedgerAccountBalance(LedgerAccountType.PLATFORM_REVENUE_COMMISSION),
    deriveLedgerAccountBalance(LedgerAccountType.PLATFORM_REVENUE_PENALTIES),
  ]);

  const derived: IPlatformWalletBalances = {
    commission,
    penalties,
    total: commission + penalties,
  };

  const discrepancies: Partial<IPlatformWalletBalances> = {};
  const buckets = ["commission", "penalties", "total"] as const;

  for (const bucket of buckets) {
    if (stored[bucket] !== derived[bucket]) {
      discrepancies[bucket] = derived[bucket];
    }
  }

  return {
    stored,
    derived,
    isBalanced: Object.keys(discrepancies).length === 0,
    discrepancies,
  };
}

// ---------------------------------------------------------------------------
// verifyJournalEntryIntegrity
// ---------------------------------------------------------------------------

export interface UnbalancedJournalEntry {
  journalId: mongoose.Types.ObjectId;
  totalCredits: number;
  totalDebits: number;
  /** credits − debits; non-zero means the entry is broken. */
  delta: number;
  lineCount: number;
}

/**
 * Verify the double-entry invariant *per journal entry*, not just in
 * aggregate. `checkGlobalBalance` only proves system-wide credits equal
 * system-wide debits — two unrelated broken entries whose errors happen to
 * cancel out would pass it silently. This function catches that case by
 * grouping ledger lines by journalId and flagging any entry where credits
 * ≠ debits, or where an entry has fewer than 2 lines (structurally invalid
 * for a double-entry system).
 *
 * Only unbalanced/malformed entries are returned — a healthy system returns
 * an empty array regardless of total ledger size. Cost is bounded by the
 * number of lines in the given date range (a single grouped aggregation),
 * so always scope this to a date window in production (e.g. a nightly cron
 * over the previous 24 hours) rather than the full collection.
 *
 * @param dateFrom - Optional start of date range (inclusive)
 * @param dateTo - Optional end of date range (inclusive)
 * @returns Array of journal entries that fail the balance or line-count check
 */
export async function verifyJournalEntryIntegrity(
  dateFrom?: Date,
  dateTo?: Date,
): Promise<UnbalancedJournalEntry[]> {
  await connectToDatabase();
  const LedgerLine = await getLedgerLineModel();

  const matchStage: Record<string, unknown> = {};
  if (dateFrom !== undefined || dateTo !== undefined) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom !== undefined) dateFilter.$gte = dateFrom;
    if (dateTo !== undefined) dateFilter.$lte = dateTo;
    matchStage.createdAt = dateFilter;
  }

  const pipeline: PipelineStage[] = [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: "$journalId",
        totalCredits: {
          $sum: {
            $cond: [{ $eq: ["$type", LedgerEntryType.CREDIT] }, "$amount", 0],
          },
        },
        totalDebits: {
          $sum: {
            $cond: [{ $eq: ["$type", LedgerEntryType.DEBIT] }, "$amount", 0],
          },
        },
        lineCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        delta: { $subtract: ["$totalCredits", "$totalDebits"] },
      },
    },
    {
      $match: {
        $or: [{ delta: { $ne: 0 } }, { lineCount: { $lt: 2 } }],
      },
    },
    { $sort: { delta: -1 } },
  ];

  const rows = await LedgerLine.aggregate<{
    _id: mongoose.Types.ObjectId;
    totalCredits: number;
    totalDebits: number;
    lineCount: number;
    delta: number;
  }>(pipeline).option({ allowDiskUse: true });

  return rows.map(
    (row: {
      _id: mongoose.Types.ObjectId;
      totalCredits: number;
      totalDebits: number;
      lineCount: number;
      delta: number;
    }) => ({
      journalId: row._id,
      totalCredits: row.totalCredits,
      totalDebits: row.totalDebits,
      delta: row.delta,
      lineCount: row.lineCount,
    }),
  );
}

// ---------------------------------------------------------------------------
// checkLedgerStructuralIntegrity
// ---------------------------------------------------------------------------

export interface OrphanedLedgerLine {
  lineId: mongoose.Types.ObjectId;
  journalId: mongoose.Types.ObjectId;
}

export interface MalformedEntityLine {
  lineId: mongoose.Types.ObjectId;
  accountType: LedgerAccountType;
  missingField: "entityId" | "entityType";
}

export interface DuplicateJournalGroup {
  referenceId: mongoose.Types.ObjectId;
  referenceType: LedgerReferenceType;
  category: string;
  count: number;
  journalIds: mongoose.Types.ObjectId[];
}

export interface StructuralIntegrityResult {
  /** Ledger lines whose journalId does not resolve to any JournalEntry. */
  orphanedLines: OrphanedLedgerLine[];
  /** VENDOR_* / CUSTOMER_* lines missing entityId or entityType. */
  malformedEntityLines: MalformedEntityLine[];
  /**
   * Journal entries sharing the same referenceId + referenceType + category.
   * Not automatically a bug — some categories can legitimately repeat for
   * the same reference (e.g. a retried PAYOUT_INITIATED). Treat as a signal
   * to investigate, not a hard failure.
   */
  duplicateJournalGroups: DuplicateJournalGroup[];
}

/**
 * Cheap, structural sanity checks that don't require replaying full account
 * balances — catches classes of corruption that a balanced-aggregate check
 * like `checkGlobalBalance` or `verifyJournalEntryIntegrity` wouldn't
 * necessarily surface.
 *
 * As with `verifyJournalEntryIntegrity`, scope this to a date range in
 * production; each check is a single aggregation/query bounded by that
 * window.
 *
 * @param dateFrom - Optional start of date range (inclusive)
 * @param dateTo - Optional end of date range (inclusive)
 */
export async function checkLedgerStructuralIntegrity(
  dateFrom?: Date,
  dateTo?: Date,
): Promise<StructuralIntegrityResult> {
  await connectToDatabase();
  const LedgerLine = await getLedgerLineModel();
  const JournalEntry = await getJournalEntryModel();

  const dateMatch: Record<string, unknown> = {};
  if (dateFrom !== undefined || dateTo !== undefined) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom !== undefined) dateFilter.$gte = dateFrom;
    if (dateTo !== undefined) dateFilter.$lte = dateTo;
    dateMatch.createdAt = dateFilter;
  }

  // --- Orphaned lines: journalId with no matching JournalEntry document ---
  const orphanPipeline = [
    ...(Object.keys(dateMatch).length > 0 ? [{ $match: dateMatch }] : []),
    {
      $lookup: {
        from: JournalEntry.collection.name,
        localField: "journalId",
        foreignField: "_id",
        as: "parent",
      },
    },
    { $match: { parent: { $size: 0 } } },
    { $project: { journalId: 1 } },
  ];

  const orphanRows = await LedgerLine.aggregate<{
    _id: mongoose.Types.ObjectId;
    journalId: mongoose.Types.ObjectId;
  }>(orphanPipeline).option({ allowDiskUse: true });

  const orphanedLines: OrphanedLedgerLine[] = orphanRows.map(
    (row: {
      _id: mongoose.Types.ObjectId;
      journalId: mongoose.Types.ObjectId;
    }) => ({
      lineId: row._id,
      journalId: row.journalId,
    }),
  );

  // --- VENDOR_*/CUSTOMER_* lines missing entityId or entityType ---
  const entityAccountTypes = [
    LedgerAccountType.VENDOR_PENDING,
    LedgerAccountType.VENDOR_AVAILABLE,
    LedgerAccountType.VENDOR_DISPUTED,
    LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
  ];

  const malformedRows = await LedgerLine.find({
    ...dateMatch,
    accountType: { $in: entityAccountTypes },
    $or: [{ entityId: { $exists: false } }, { entityType: { $exists: false } }],
  }).lean<
    {
      _id: mongoose.Types.ObjectId;
      accountType: LedgerAccountType;
      entityId?: unknown;
      entityType?: unknown;
    }[]
  >();

  const malformedEntityLines: MalformedEntityLine[] = [];
  for (const row of malformedRows) {
    if (row.entityId === undefined) {
      malformedEntityLines.push({
        lineId: row._id,
        accountType: row.accountType,
        missingField: "entityId",
      });
    }
    if (row.entityType === undefined) {
      malformedEntityLines.push({
        lineId: row._id,
        accountType: row.accountType,
        missingField: "entityType",
      });
    }
  }

  // --- Duplicate journal entries for the same reference + category ---
  const duplicatePipeline = [
    ...(Object.keys(dateMatch).length > 0 ? [{ $match: dateMatch }] : []),
    {
      $group: {
        _id: {
          referenceId: "$referenceId",
          referenceType: "$referenceType",
          category: "$category",
        },
        count: { $sum: 1 },
        journalIds: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ];

  const duplicateRows = await JournalEntry.aggregate<{
    _id: {
      referenceId: mongoose.Types.ObjectId;
      referenceType: LedgerReferenceType;
      category: string;
    };
    count: number;
    journalIds: mongoose.Types.ObjectId[];
  }>(duplicatePipeline).option({ allowDiskUse: true });

  const duplicateJournalGroups: DuplicateJournalGroup[] = duplicateRows.map(
    (row: {
      _id: {
        referenceId: mongoose.Types.ObjectId;
        referenceType: LedgerReferenceType;
        category: string;
      };
      count: number;
      journalIds: mongoose.Types.ObjectId[];
    }) => ({
      referenceId: row._id.referenceId,
      referenceType: row._id.referenceType,
      category: row._id.category,
      count: row.count,
      journalIds: row.journalIds,
    }),
  );

  return { orphanedLines, malformedEntityLines, duplicateJournalGroups };
}

// ---------------------------------------------------------------------------
// checkEscrowSolvency
// ---------------------------------------------------------------------------

export interface EscrowSolvencyResult {
  /** PLATFORM_ESCROW's own balance (asset convention: debit increases it). */
  escrowBalance: number;
  /** PAYOUT_PROCESSING's balance: money owed to vendors while in transit to their bank (liability convention: credit increases it). */
  payoutProcessing: number;
  /** VENDOR_DEBT_RECEIVABLE: money vendors owe the platform (asset convention: debit increases it). */
  debtReceivable: number;
  /** escrowBalance + payoutProcessing + debtReceivable: total assets/claims the platform controls. */
  platformHeldCash: number;
  liabilities: {
    vendorPending: number;
    vendorAvailable: number;
    vendorDisputed: number;
    customerRefundPayable: number;
    total: number;
  };
  /** True when platformHeldCash >= liabilities.total. */
  isSolvent: boolean;
  /**
   * platformHeldCash − liabilities.total: the surplus.
   * Positive by exactly retained earnings (commission + penalties − gateway
   * expense) in a healthy system, since revenue cash never leaves escrow.
   * For an exact integrity identity, see checkLedgerAccountingIdentity.
   */
  delta: number;
}

/**
 * Verifies that the assets and claims the platform controls
 * (PLATFORM_ESCROW + PAYOUT_PROCESSING + VENDOR_DEBT_RECEIVABLE) cover
 * everything it still owes or holds on behalf of vendors and customers.
 *
 * Account conventions (all now consistent across JournalEntryWriter):
 *   - PLATFORM_ESCROW: asset, debit increases. The platform's cash.
 *   - VENDOR_DEBT_RECEIVABLE: asset, debit increases. Money vendors owe.
 *   - PAYOUT_PROCESSING: liability, credit increases. Owed to a vendor while
 *     in transit to their bank; still added to the platform's controlled
 *     total because the cash has not left until the payout completes.
 *   - VENDOR_* /CUSTOMER_REFUND_PAYABLE: liabilities, credit increases.
 *
 * Settlement is a pure reclassification and never touches PLATFORM_ESCROW, so
 * PAYOUT_PROCESSING and VENDOR_DEBT_RECEIVABLE are added to escrow to get the
 * platform's full controlled position before comparing against liabilities.
 *
 * This is a solvency signal: isSolvent is platformHeldCash >= liabilities, and
 * delta is the surplus. In a healthy system the surplus equals retained
 * earnings (revenue cash never leaves escrow), so an exact-zero delta is NOT
 * expected here. For an exact integrity check, use checkLedgerAccountingIdentity.
 */
export async function checkEscrowSolvency(): Promise<EscrowSolvencyResult> {
  const [
    escrowBalance,
    payoutProcessing,
    debtReceivable,
    vendorPending,
    vendorAvailable,
    vendorDisputed,
    customerRefundPayable,
  ] = await Promise.all([
    deriveLedgerAccountBalance(LedgerAccountType.PLATFORM_ESCROW, {
      increasesOn: "debit",
    }),
    deriveLedgerAccountBalance(LedgerAccountType.PAYOUT_PROCESSING),
    deriveLedgerAccountBalance(LedgerAccountType.VENDOR_DEBT_RECEIVABLE, {
      increasesOn: "debit",
    }),
    deriveLedgerAccountBalance(LedgerAccountType.VENDOR_PENDING),
    deriveLedgerAccountBalance(LedgerAccountType.VENDOR_AVAILABLE),
    deriveLedgerAccountBalance(LedgerAccountType.VENDOR_DISPUTED),
    deriveLedgerAccountBalance(LedgerAccountType.CUSTOMER_REFUND_PAYABLE),
  ]);

  const platformHeldCash = escrowBalance + payoutProcessing + debtReceivable;

  const liabilitiesTotal =
    vendorPending + vendorAvailable + vendorDisputed + customerRefundPayable;

  return {
    escrowBalance,
    payoutProcessing,
    debtReceivable,
    platformHeldCash,
    liabilities: {
      vendorPending,
      vendorAvailable,
      vendorDisputed,
      customerRefundPayable,
      total: liabilitiesTotal,
    },
    isSolvent: platformHeldCash >= liabilitiesTotal,
    delta: platformHeldCash - liabilitiesTotal,
  };
}

// ---------------------------------------------------------------------------
// checkLedgerAccountingIdentity
// ---------------------------------------------------------------------------

export interface LedgerAccountingIdentityResult {
  /** escrow + payoutProcessing + debtReceivable − third-party liabilities. */
  assetsMinusLiabilities: number;
  /** commission + penalties − gatewayExpense: the platform's retained earnings. */
  retainedEarnings: number;
  /** True when the two sides match exactly. */
  isBalanced: boolean;
  /** assetsMinusLiabilities − retainedEarnings; non-zero means a broken entry. */
  delta: number;
  /** The individual account balances, for drill-down when delta is non-zero. */
  components: {
    escrowBalance: number;
    payoutProcessing: number;
    debtReceivable: number;
    vendorPending: number;
    vendorAvailable: number;
    vendorDisputed: number;
    customerRefundPayable: number;
    commission: number;
    penalties: number;
    gatewayExpense: number;
  };
}

/**
 * Exact system-wide accounting identity. Because commission and penalty revenue
 * never physically leave PLATFORM_ESCROW (settlement is a reclassification and
 * nothing sweeps revenue cash out), the platform's assets always exceed its
 * third-party liabilities by exactly its retained earnings. The identity that
 * must hold in a correct system is:
 *
 *   escrow + payoutProcessing + debtReceivable
 *     − (vendorPending + vendorAvailable + vendorDisputed + customerRefundPayable)
 *   === commission + penalties − gatewayExpense
 *
 * Unlike checkEscrowSolvency (a loose >= signal), this asserts exact equality.
 * A non-zero delta means a journal entry is malformed somewhere: a wrong
 * account, a wrong direction, or a line written outside JournalEntryWriter.
 * Pairs well with checkGlobalBalance and verifyJournalEntryIntegrity: those
 * prove entries are internally balanced; this proves the accounts relate to
 * each other correctly.
 */
export async function checkLedgerAccountingIdentity(): Promise<LedgerAccountingIdentityResult> {
  const [
    escrowBalance,
    payoutProcessing,
    debtReceivable,
    vendorPending,
    vendorAvailable,
    vendorDisputed,
    customerRefundPayable,
    commission,
    penalties,
    gatewayExpense,
  ] = await Promise.all([
    deriveLedgerAccountBalance(LedgerAccountType.PLATFORM_ESCROW, {
      increasesOn: "debit",
    }),
    deriveLedgerAccountBalance(LedgerAccountType.PAYOUT_PROCESSING),
    deriveLedgerAccountBalance(LedgerAccountType.VENDOR_DEBT_RECEIVABLE, {
      increasesOn: "debit",
    }),
    deriveLedgerAccountBalance(LedgerAccountType.VENDOR_PENDING),
    deriveLedgerAccountBalance(LedgerAccountType.VENDOR_AVAILABLE),
    deriveLedgerAccountBalance(LedgerAccountType.VENDOR_DISPUTED),
    deriveLedgerAccountBalance(LedgerAccountType.CUSTOMER_REFUND_PAYABLE),
    deriveLedgerAccountBalance(LedgerAccountType.PLATFORM_REVENUE_COMMISSION),
    deriveLedgerAccountBalance(LedgerAccountType.PLATFORM_REVENUE_PENALTIES),
    deriveLedgerAccountBalance(LedgerAccountType.GATEWAY_FEES_EXPENSE, {
      increasesOn: "debit",
    }),
  ]);

  const assetsMinusLiabilities =
    escrowBalance +
    payoutProcessing +
    debtReceivable -
    (vendorPending + vendorAvailable + vendorDisputed + customerRefundPayable);

  const retainedEarnings = commission + penalties - gatewayExpense;

  const delta = assetsMinusLiabilities - retainedEarnings;

  return {
    assetsMinusLiabilities,
    retainedEarnings,
    isBalanced: delta === 0,
    delta,
    components: {
      escrowBalance,
      payoutProcessing,
      debtReceivable,
      vendorPending,
      vendorAvailable,
      vendorDisputed,
      customerRefundPayable,
      commission,
      penalties,
      gatewayExpense,
    },
  };
}

// ---------------------------------------------------------------------------
// reconcileTransactionRecord
// ---------------------------------------------------------------------------

export interface SuborderBreakdownDiscrepancy {
  suborderId: mongoose.Types.ObjectId;
  stored: { commission: number; settleAmount: number };
  derived: { commission: number; settleAmount: number };
  discrepancies: Partial<{ commission: number; settleAmount: number }>;
}

export interface TransactionRecordReconciliationResult {
  orderId: mongoose.Types.ObjectId;
  isBalanced: boolean;
  suborderDiscrepancies: SuborderBreakdownDiscrepancy[];
}

/**
 * Cross-checks the commission/settleAmount captured on a TransactionRecord
 * at payment time against what was actually written to the ledger for each
 * suborder. Catches drift between what `calculateCommission` produced when
 * the order was placed and what the ledger ended up recording.
 *
 * Settlement is now one balanced journal entry per suborder
 * (`writeSuborderSettlement`), keyed by `referenceId: suborderId`,
 * `referenceType: SUBORDER`, `category: VENDOR_SETTLEMENT`. Each such entry
 * has exactly one PLATFORM_REVENUE_COMMISSION credit and one VENDOR_PENDING
 * credit, so per-suborder commission and settle amounts are read directly off
 * that entry's lines with no risk of pulling in later same-suborder entries
 * (release, dispute) that use different categories.
 *
 * @param orderId - The _id of the order
 * @throws {Error} If no TransactionRecord exists for the given orderId
 */
export async function reconcileTransactionRecord(
  orderId: string,
): Promise<TransactionRecordReconciliationResult> {
  await connectToDatabase();
  const TransactionRecord = await getTransactionRecordModel();
  const JournalEntry = await getJournalEntryModel();
  const LedgerLine = await getLedgerLineModel();

  const record = await TransactionRecord.findOne({ orderId }).lean<{
    suborderBreakdowns: ISuborderBreakdown[];
  }>();

  if (!record) {
    throw new Error(
      `reconcileTransactionRecord: No TransactionRecord found for orderId "${orderId}".`,
    );
  }

  const suborderDiscrepancies: SuborderBreakdownDiscrepancy[] = [];

  for (const breakdown of record.suborderBreakdowns) {
    const journalEntries = await JournalEntry.find({
      referenceId: breakdown.suborderId,
      referenceType: LedgerReferenceType.SUBORDER,
      category: LedgerEntryCategory.VENDOR_SETTLEMENT,
    }).lean<{ _id: mongoose.Types.ObjectId }[]>();

    if (journalEntries.length === 0) {
      // Payment was recorded on the TransactionRecord but no settlement
      // journal entry exists for this suborder — a clear write-path gap.
      suborderDiscrepancies.push({
        suborderId: breakdown.suborderId,
        stored: {
          commission: breakdown.commission,
          settleAmount: breakdown.settleAmount,
        },
        derived: { commission: 0, settleAmount: 0 },
        discrepancies: { commission: 0, settleAmount: 0 },
      });
      continue;
    }

    const journalIds = journalEntries.map(
      (entry: { _id: mongoose.Types.ObjectId }) => entry._id,
    );

    const commissionLines = await LedgerLine.find({
      journalId: { $in: journalIds },
      accountType: LedgerAccountType.PLATFORM_REVENUE_COMMISSION,
    }).lean<{ type: LedgerEntryType; amount: number }[]>();

    let derivedCommission = 0;
    for (const line of commissionLines) {
      derivedCommission +=
        line.type === LedgerEntryType.CREDIT ? line.amount : -line.amount;
    }

    const settlementLines = await LedgerLine.find({
      journalId: { $in: journalIds },
      accountType: LedgerAccountType.VENDOR_PENDING,
      entityId: breakdown.vendorId,
    }).lean<{ type: LedgerEntryType; amount: number }[]>();

    let derivedSettleAmount = 0;
    for (const line of settlementLines) {
      derivedSettleAmount +=
        line.type === LedgerEntryType.CREDIT ? line.amount : -line.amount;
    }

    const discrepancies: Partial<{
      commission: number;
      settleAmount: number;
    }> = {};

    if (breakdown.commission !== derivedCommission) {
      discrepancies.commission = derivedCommission;
    }
    if (breakdown.settleAmount !== derivedSettleAmount) {
      discrepancies.settleAmount = derivedSettleAmount;
    }

    if (Object.keys(discrepancies).length > 0) {
      suborderDiscrepancies.push({
        suborderId: breakdown.suborderId,
        stored: {
          commission: breakdown.commission,
          settleAmount: breakdown.settleAmount,
        },
        derived: {
          commission: derivedCommission,
          settleAmount: derivedSettleAmount,
        },
        discrepancies,
      });
    }
  }

  return {
    orderId: new mongoose.Types.ObjectId(orderId),
    isBalanced: suborderDiscrepancies.length === 0,
    suborderDiscrepancies,
  };
}

// ---------------------------------------------------------------------------
// reconcileVendorDebt
// ---------------------------------------------------------------------------

export interface VendorDebtReconciliationResult {
  vendorId: mongoose.Types.ObjectId;
  stored: number;
  derived: number;
  isBalanced: boolean;
}

/**
 * Reconciles VendorWallet.debt.amount, a running-state field not covered by
 * `reconcileVendorWallet`'s balances diff, against the ledger.
 *
 * Under the clamp-and-receivable debt model (Option B), a vendor's available
 * balance never goes below zero. When an upheld penalty exceeds available, the
 * shortfall is recorded in the per-vendor VENDOR_DEBT_RECEIVABLE account:
 *
 *   writeDisputeUpheld:  DEBIT  VENDOR_DEBT_RECEIVABLE  penaltyToDebt   (debt up)
 *   writeDebtRecovery:   CREDIT VENDOR_DEBT_RECEIVABLE  recoveredAmount (debt down)
 *
 * VENDOR_DEBT_RECEIVABLE is asset-style (debit increases it), so its net
 * balance for a vendor is the amount that vendor currently owes the platform:
 *
 *   derived debt = deriveLedgerAccountBalance(VENDOR_DEBT_RECEIVABLE, { entityId })
 *
 * A healthy vendor with no debt has a net balance of zero here.
 *
 * @param vendorId - The _id of the vendor
 * @throws {Error} If no VendorWallet exists for the given vendorId
 */
export async function reconcileVendorDebt(
  vendorId: string,
): Promise<VendorDebtReconciliationResult> {
  await connectToDatabase();
  const VendorWallet = await getVendorWalletModel();

  const wallet = await VendorWallet.findOne({
    vendorId: new mongoose.Types.ObjectId(vendorId),
  }).lean<{ debt: { amount: number } }>();

  if (!wallet) {
    throw new Error(
      `reconcileVendorDebt: No VendorWallet found for vendorId "${vendorId}".`,
    );
  }

  const derived = await deriveLedgerAccountBalance(
    LedgerAccountType.VENDOR_DEBT_RECEIVABLE,
    { entityId: vendorId, increasesOn: "debit" },
  );

  return {
    vendorId: new mongoose.Types.ObjectId(vendorId),
    stored: wallet.debt.amount,
    derived,
    isBalanced: wallet.debt.amount === derived,
  };
}
