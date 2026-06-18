import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { LedgerEntryType, LedgerAccountType } from "@/enums/financial.enums";
import { getLedgerLineModel } from "@/lib/db/models/ledger-line.model";
import {
  getVendorWalletModel,
  type IVendorWalletBalances,
} from "@/lib/db/models/vendor-wallet.model";

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
