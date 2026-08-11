import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  startTestDb,
  stopTestDb,
  clearAllCollections,
  withTransaction,
} from "../helpers/test-db";
import {
  seedVendorWallet,
  seedPlatformWallet,
  seedSettledSuborder,
  type SeededPaidOrder,
} from "../helpers/seed";
import { expectSystemConsistent } from "../helpers/invariants";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  freezeVendorFunds,
  releaseVendorDisputedToAvailable,
  applyDisputeUpheldDeductions,
  getVendorWalletByVendorId,
} from "@/lib/db/models/vendor-wallet.model";
import {
  debitPlatformCommission,
  creditPlatformPenalty,
  getPlatformWallet,
} from "@/lib/db/models/platform-wallet.model";
import { updateSuborderFinancialStatus } from "@/lib/db/models/transaction-record.model";
import {
  SuborderFinancialStatus,
  DebtRecoveryType,
} from "@/enums/financial.enums";

/**
 * Stage 3 — Disputes.
 *
 * Each helper mirrors, call for call, the financial composition of its
 * production call site:
 *  - open:          src/app/api/disputes/open/route.ts:237-255
 *  - reject:        src/modules/server/admin/disputes/procedures.ts:383-396
 *  - uphold:        src/modules/server/admin/disputes/procedures.ts:176-215
 *  - auto-resolve:  src/services/disputes/dispute-auto-resolution.service.ts:194-219
 */

async function openDispute(
  order: SeededPaidOrder,
  disputeId: mongoose.Types.ObjectId,
) {
  const s = order.suborders[0]!;
  const writer = await JournalEntryWriter.init();
  await withTransaction(async (session) => {
    await writer.writeDisputeOpened({
      vendorId: s.vendorId,
      settleAmount: s.settleAmount,
      disputeId,
      session,
    });
    await updateSuborderFinancialStatus(
      order.orderId.toString(),
      s.suborderId.toString(),
      SuborderFinancialStatus.DISPUTED,
      session,
    );
    await freezeVendorFunds(s.vendorId.toString(), s.settleAmount, session);
  });
}

async function rejectDispute(
  order: SeededPaidOrder,
  disputeId: mongoose.Types.ObjectId,
) {
  const s = order.suborders[0]!;
  const writer = await JournalEntryWriter.init();
  await withTransaction(async (session) => {
    await writer.writeDisputeRejected({
      vendorId: s.vendorId,
      settleAmount: s.settleAmount,
      disputeId,
      session,
    });
    await releaseVendorDisputedToAvailable(
      s.vendorId.toString(),
      s.settleAmount,
      session,
    );
    await updateSuborderFinancialStatus(
      order.orderId.toString(),
      s.suborderId.toString(),
      SuborderFinancialStatus.SETTLED,
      session,
    );
  });
}

async function upholdDispute(
  order: SeededPaidOrder,
  disputeId: mongoose.Types.ObjectId,
  penaltyAmount: number,
): Promise<{ penaltyFromAvailable: number }> {
  const s = order.suborders[0]!;
  const writer = await JournalEntryWriter.init();
  let penaltyFromAvailable = 0;

  await withTransaction(async (session) => {
    const deduction = await applyDisputeUpheldDeductions(
      s.vendorId.toString(),
      s.settleAmount,
      penaltyAmount,
      DebtRecoveryType.FULL_BLOCK,
      0,
      session,
    );
    if (!deduction) throw new Error("Vendor wallet not found");
    penaltyFromAvailable = deduction.penaltyFromAvailable;

    await writer.writeDisputeUpheld({
      vendorId: s.vendorId,
      customerId: order.customerId,
      settleAmount: s.settleAmount,
      commission: s.commission,
      penaltyAmount,
      penaltyFromAvailable,
      disputeId,
      session,
    });

    await debitPlatformCommission(s.commission, session);
    await creditPlatformPenalty(penaltyAmount, session);

    await updateSuborderFinancialStatus(
      order.orderId.toString(),
      s.suborderId.toString(),
      SuborderFinancialStatus.REFUNDED,
      session,
    );
  });

  return { penaltyFromAvailable };
}

async function autoResolveDispute(
  order: SeededPaidOrder,
  disputeId: mongoose.Types.ObjectId,
) {
  const s = order.suborders[0]!;
  const writer = await JournalEntryWriter.init();
  await withTransaction(async (session) => {
    await writer.writeDisputeAutoResolved({
      vendorId: s.vendorId,
      customerId: order.customerId,
      settleAmount: s.settleAmount,
      commission: s.commission,
      disputeId,
      session,
    });
    await applyDisputeUpheldDeductions(
      s.vendorId.toString(),
      s.settleAmount,
      0,
      DebtRecoveryType.FULL_BLOCK,
      0,
      session,
    );
    await debitPlatformCommission(s.commission, session);
    await updateSuborderFinancialStatus(
      order.orderId.toString(),
      s.suborderId.toString(),
      SuborderFinancialStatus.REFUNDED,
      session,
    );
  });
}

describe("Stage 3 — disputes", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearAllCollections();
    await seedPlatformWallet();
  });

  it("open → reject: vendor ends exactly where they started (findings doc Test A, steps 1-4)", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    const order = await seedSettledSuborder({
      grossAmount: 500_000,
      vendorId,
    });
    const settle = order.suborders[0]!.settleAmount;
    const disputeId = new mongoose.Types.ObjectId();

    await openDispute(order, disputeId);

    let wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances).toMatchObject({
      available: 0,
      disputed: settle,
      pending: 0,
      total: settle,
    });
    await expectSystemConsistent([vendorId.toString()]);

    await rejectDispute(order, disputeId);

    wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances).toMatchObject({
      available: settle,
      disputed: 0,
      pending: 0,
      total: settle,
    });
    const solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.escrowBalance).toBe(order.totalAmount);
  });

  it("open → uphold, penalty covered by available: refund liability, penalty revenue, no debt", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    // Two settled orders so the vendor has extra available to absorb the penalty
    const extra = await seedSettledSuborder({ grossAmount: 300_000, vendorId });
    const order = await seedSettledSuborder({ grossAmount: 500_000, vendorId });
    const s = order.suborders[0]!;
    const disputeId = new mongoose.Types.ObjectId();
    const penalty = 50_000; // well under the extra order's settle amount

    await openDispute(order, disputeId);
    const { penaltyFromAvailable } = await upholdDispute(
      order,
      disputeId,
      penalty,
    );
    expect(penaltyFromAvailable).toBe(penalty); // fully covered

    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances).toMatchObject({
      available: extra.suborders[0]!.settleAmount - penalty,
      disputed: 0,
      pending: 0,
    });
    expect(wallet!.debt.amount).toBe(0);

    const platform = await getPlatformWallet();
    // Commission for the disputed order reversed; the other order's retained
    expect(platform!.balances.commission).toBe(extra.totalCommission);
    expect(platform!.balances.penalties).toBe(penalty);

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    // Student is owed the FULL amountPaid back
    expect(solvency.liabilities.customerRefundPayable).toBe(s.grossAmount);
  });

  it("open → uphold, penalty exceeds available: available clamps at zero, shortfall becomes debt (findings doc Test A, step 5)", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    const order = await seedSettledSuborder({ grossAmount: 500_000, vendorId });
    const s = order.suborders[0]!;
    const disputeId = new mongoose.Types.ObjectId();

    await openDispute(order, disputeId);
    // After open, available is 0 (all of it came from this one order) — the
    // entire penalty must become debt.
    const penalty = 40_000;
    const { penaltyFromAvailable } = await upholdDispute(
      order,
      disputeId,
      penalty,
    );
    expect(penaltyFromAvailable).toBe(0);

    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances).toMatchObject({
      available: 0, // clamped — never negative under the receivable model
      disputed: 0,
      pending: 0,
      total: 0,
    });
    expect(wallet!.debt.amount).toBe(penalty);
    expect(wallet!.debt.recoveryType).toBe(DebtRecoveryType.FULL_BLOCK);

    const platform = await getPlatformWallet();
    expect(platform!.balances.commission).toBe(0); // reversed
    expect(platform!.balances.penalties).toBe(penalty); // full penalty is revenue

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.liabilities.customerRefundPayable).toBe(s.grossAmount);
    expect(solvency.debtReceivable).toBe(penalty);
  });

  it("open → uphold with a partially covered penalty splits exactly between available and debt", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    const extra = await seedSettledSuborder({ grossAmount: 150_000, vendorId });
    const order = await seedSettledSuborder({ grossAmount: 500_000, vendorId });
    const disputeId = new mongoose.Types.ObjectId();

    await openDispute(order, disputeId);

    const availableBefore = extra.suborders[0]!.settleAmount;
    const penalty = availableBefore + 25_000; // forces a 25k shortfall

    const { penaltyFromAvailable } = await upholdDispute(
      order,
      disputeId,
      penalty,
    );
    expect(penaltyFromAvailable).toBe(availableBefore);

    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances.available).toBe(0);
    expect(wallet!.debt.amount).toBe(25_000);

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.debtReceivable).toBe(25_000);
  });

  it("open → auto-resolve: full refund, commission reversed, NO penalty", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    const order = await seedSettledSuborder({ grossAmount: 500_000, vendorId });
    const s = order.suborders[0]!;
    const disputeId = new mongoose.Types.ObjectId();

    await openDispute(order, disputeId);
    await autoResolveDispute(order, disputeId);

    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances).toMatchObject({
      available: 0,
      disputed: 0,
      pending: 0,
      total: 0,
    });
    expect(wallet!.debt.amount).toBe(0);
    expect(wallet!.debt.recoveryType).toBeNull(); // no policy set at zero penalty

    const platform = await getPlatformWallet();
    expect(platform!.balances.commission).toBe(0);
    expect(platform!.balances.penalties).toBe(0);

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.liabilities.customerRefundPayable).toBe(s.grossAmount);
    // No retained earnings left for this order: commission reversed, no penalty
    expect(solvency.delta).toBe(0);
  });
});
