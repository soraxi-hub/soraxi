import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  startTestDb,
  stopTestDb,
  clearAllCollections,
  withTransaction,
} from "../helpers/test-db";
import { seedVendorWallet, seedPlatformWallet } from "../helpers/seed";
import { checkLedgerStructuralIntegrity } from "@/lib/utils/reconciliation.util";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import { LedgerEntryCategory } from "@/enums/financial.enums";
import { getJournalEntryModel } from "@/lib/db/models/journal-entry.model";

/**
 * Duplicate detection in checkLedgerStructuralIntegrity.
 *
 * A failed payout writes three reversals against one payout — the net, the
 * processing fee and the transfer fee. Until those were given distinct
 * categories, all three shared `PAYOUT_FAILED`, and a check that flagged
 * entries merely for sharing a (referenceId, referenceType, category) triple
 * reported a discrepancy after every valid payout failure. That happened in
 * production on 2026-09-07.
 *
 * Two fixes, both exercised here: the reversals now mirror the entries they
 * undo, and "duplicate" now means the same movement written twice rather than
 * several entries wearing one label.
 */

const PAYOUT_ID = new mongoose.Types.ObjectId();
const VENDOR_ID = new mongoose.Types.ObjectId();

/** The three reversals a failed payout writes, exactly as production does. */
async function writeFailedPayoutReversals() {
  const writer = await JournalEntryWriter.init();

  await withTransaction(async (session) => {
    await writer.writePayoutFailed({
      vendorId: VENDOR_ID,
      requestedAmount: 94_000,
      payoutId: PAYOUT_ID,
      session,
    });
    await writer.writePayoutProcessingFeeReversal({
      vendorId: VENDOR_ID,
      processingFee: 6_000,
      payoutId: PAYOUT_ID,
      session,
    });
    await writer.writeGatewayFeeReversal({
      feeAmount: 1_075,
      payoutId: PAYOUT_ID,
      session,
    });
  });
}

beforeAll(async () => {
  await startTestDb();
});

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearAllCollections();
  await seedPlatformWallet();
  await seedVendorWallet(VENDOR_ID);
});

describe("failed payout reversals — category naming", () => {
  it("files each reversal under the category it mirrors", async () => {
    await writeFailedPayoutReversals();

    const JournalEntry = await getJournalEntryModel();
    const entries = await JournalEntry.find({ referenceId: PAYOUT_ID })
      .select("category")
      .lean<{ category: LedgerEntryCategory }[]>();

    const categories = entries.map((e) => e.category).sort();

    // Each reversal now names what it moved, matching its forward entry —
    // rather than all three naming why they happened.
    expect(categories).toEqual(
      [
        LedgerEntryCategory.PAYOUT_FAILED,
        LedgerEntryCategory.COMMISSION_REVERSED,
        LedgerEntryCategory.TRANSFER_FEE_REVERSED,
      ].sort(),
    );
  });
});

describe("checkLedgerStructuralIntegrity — duplicate detection", () => {
  it("does not flag the three reversals of a failed payout", async () => {
    // The production false positive, reproduced. Three entries, one payout,
    // three different movements: legitimate, and must stay silent.
    await writeFailedPayoutReversals();

    const result = await checkLedgerStructuralIntegrity();

    expect(result.duplicateJournalGroups).toEqual([]);
    expect(result.orphanedLines).toEqual([]);
    expect(result.malformedEntityLines).toEqual([]);
  });

  it("flags the same movement written twice", async () => {
    // The thing the check actually exists to catch: a reversal that ran twice
    // would silently over-credit the vendor's available balance.
    await writeFailedPayoutReversals();

    const writer = await JournalEntryWriter.init();
    await withTransaction(async (session) => {
      await writer.writePayoutProcessingFeeReversal({
        vendorId: VENDOR_ID,
        processingFee: 6_000,
        payoutId: PAYOUT_ID,
        session,
      });
    });

    const result = await checkLedgerStructuralIntegrity();

    expect(result.duplicateJournalGroups).toHaveLength(1);

    const group = result.duplicateJournalGroups[0]!;
    expect(group.count).toBe(2);
    expect(group.category).toBe(LedgerEntryCategory.COMMISSION_REVERSED);
    expect(group.journalIds).toHaveLength(2);

    // The alert names the repeated movement, so it can be acted on without
    // first querying the ledger by hand.
    expect(group.fingerprint).toContain("6000");
    expect(group.fingerprint).toContain("vendor_available");
  });

  it("distinguishes a repeat from a different amount under the same category", async () => {
    // A second reversal for a DIFFERENT amount is not the same movement, so
    // fingerprinting leaves it alone. Worth pinning: it is the one case the
    // old shared-label check would have flagged and this one does not.
    await writeFailedPayoutReversals();

    const writer = await JournalEntryWriter.init();
    await withTransaction(async (session) => {
      await writer.writePayoutProcessingFeeReversal({
        vendorId: VENDOR_ID,
        processingFee: 9_999,
        payoutId: PAYOUT_ID,
        session,
      });
    });

    const result = await checkLedgerStructuralIntegrity();

    expect(result.duplicateJournalGroups).toEqual([]);
  });
});
