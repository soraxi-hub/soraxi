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
  seedPaidOrder,
  seedSettledSuborder,
  type SeededPaidOrder,
} from "../helpers/seed";
import { expectSystemConsistent } from "../helpers/invariants";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  getVendorWalletModel,
  getVendorWalletByVendorId,
  freezeVendorFunds,
  applyDisputeUpheldDeductions,
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
 * Stage 5 — Refunds.
 *
 * Helpers mirror the DB-only financial composition of RefundService
 * (src/services/refund.service.ts):
 *  - cancellation:     writeOrderCancellationRefund + debitPlatformCommission
 *                      + pending deduction + suborder → REFUNDED  (lines 242-262)
 *  - failed delivery:  writeFailedDeliveryRefund + pending deduction
 *                      + suborder → REFUNDED (commission retained) (lines 352-365)
 *  - confirmation:     writeRefundConfirmed (webhook / manual admin path)
 *
 * The Flutterwave API call and RefundRecord bookkeeping are outside the
 * ledger and deliberately not mirrored here.
 */

async function deductPendingForRefund(
  vendorId: mongoose.Types.ObjectId,
  settleAmount: number,
  session: mongoose.ClientSession,
) {
  const VendorWallet = await getVendorWalletModel();
  await VendorWallet.findOneAndUpdate(
    { vendorId },
    {
      $inc: {
        "balances.pending": -settleAmount,
        "balances.total": -settleAmount,
      },
    },
    { session },
  );
}

async function cancelOrderRefund(order: SeededPaidOrder) {
  const s = order.suborders[0]!;
  const refundId = new mongoose.Types.ObjectId();
  const writer = await JournalEntryWriter.init();
  await withTransaction(async (session) => {
    await writer.writeOrderCancellationRefund({
      vendorId: s.vendorId,
      customerId: order.customerId,
      settleAmount: s.settleAmount,
      commission: s.commission,
      amountPaid: s.grossAmount,
      refundId,
      suborderId: s.suborderId,
      session,
    });
    await debitPlatformCommission(s.commission, session);
    await deductPendingForRefund(s.vendorId, s.settleAmount, session);
    await updateSuborderFinancialStatus(
      order.orderId.toString(),
      s.suborderId.toString(),
      SuborderFinancialStatus.REFUNDED,
      session,
    );
  });
  return refundId;
}

async function failedDeliveryRefund(order: SeededPaidOrder) {
  const s = order.suborders[0]!;
  const refundId = new mongoose.Types.ObjectId();
  const writer = await JournalEntryWriter.init();
  await withTransaction(async (session) => {
    await writer.writeFailedDeliveryRefund({
      vendorId: s.vendorId,
      customerId: order.customerId,
      settleAmount: s.settleAmount,
      refundId,
      suborderId: s.suborderId,
      session,
    });
    await deductPendingForRefund(s.vendorId, s.settleAmount, session);
    await updateSuborderFinancialStatus(
      order.orderId.toString(),
      s.suborderId.toString(),
      SuborderFinancialStatus.REFUNDED,
      session,
    );
  });
  return refundId;
}

async function confirmRefund(
  customerId: mongoose.Types.ObjectId,
  amountRefunded: number,
  refundId: mongoose.Types.ObjectId,
) {
  const writer = await JournalEntryWriter.init();
  await withTransaction(async (session) => {
    await writer.writeRefundConfirmed({
      customerId,
      amountRefunded,
      refundId,
      session,
    });
  });
}

describe("Stage 5 — refunds", () => {
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

  it("order cancellation: full amountPaid owed back, commission reversed, then confirmation closes the loop", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    const order = await seedPaidOrder({
      suborderGrossAmounts: [500_000],
      vendorIds: [vendorId],
    });
    const s = order.suborders[0]!;

    const refundId = await cancelOrderRefund(order);

    let wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances).toMatchObject({ pending: 0, total: 0 });

    const platform = await getPlatformWallet();
    expect(platform!.balances.commission).toBe(0); // reversed

    let solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.liabilities.customerRefundPayable).toBe(s.grossAmount);
    expect(solvency.escrowBalance).toBe(s.grossAmount); // cash not yet out
    expect(solvency.delta).toBe(0); // nothing earned on a cancelled sale

    await confirmRefund(order.customerId, s.grossAmount, refundId);

    solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.liabilities.customerRefundPayable).toBe(0);
    expect(solvency.escrowBalance).toBe(0); // cash returned to the student
    expect(solvency.delta).toBe(0);
  });

  it("failed delivery: only the settle amount refunded, commission retained", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    const order = await seedPaidOrder({
      suborderGrossAmounts: [500_000],
      vendorIds: [vendorId],
    });
    const s = order.suborders[0]!;

    const refundId = await failedDeliveryRefund(order);

    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances).toMatchObject({ pending: 0, total: 0 });

    const platform = await getPlatformWallet();
    expect(platform!.balances.commission).toBe(s.commission); // retained

    let solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.liabilities.customerRefundPayable).toBe(s.settleAmount);

    await confirmRefund(order.customerId, s.settleAmount, refundId);

    solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.liabilities.customerRefundPayable).toBe(0);
    // Commission stays behind in escrow as the platform's earnings
    expect(solvency.escrowBalance).toBe(s.commission);
    expect(solvency.delta).toBe(s.commission);
  });

  it("dispute-upheld refund: confirmation pays out the full amountPaid frozen by the uphold", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    const order = await seedSettledSuborder({ grossAmount: 500_000, vendorId });
    const s = order.suborders[0]!;
    const disputeId = new mongoose.Types.ObjectId();
    const penalty = 20_000;
    const writer = await JournalEntryWriter.init();

    // Open + uphold (mirrors Stage 3 compositions)
    await withTransaction(async (session) => {
      await writer.writeDisputeOpened({
        vendorId,
        settleAmount: s.settleAmount,
        disputeId,
        session,
      });
      await freezeVendorFunds(vendorId.toString(), s.settleAmount, session);
    });
    await withTransaction(async (session) => {
      const deduction = await applyDisputeUpheldDeductions(
        vendorId.toString(),
        s.settleAmount,
        penalty,
        DebtRecoveryType.FULL_BLOCK,
        0,
        session,
      );
      await writer.writeDisputeUpheld({
        vendorId,
        customerId: order.customerId,
        settleAmount: s.settleAmount,
        commission: s.commission,
        penaltyAmount: penalty,
        penaltyFromAvailable: deduction!.penaltyFromAvailable,
        disputeId,
        session,
      });
      await debitPlatformCommission(s.commission, session);
      await creditPlatformPenalty(penalty, session);
    });

    const refundId = new mongoose.Types.ObjectId();
    await confirmRefund(order.customerId, s.grossAmount, refundId);

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.liabilities.customerRefundPayable).toBe(0);
    // Escrow: gross in, amountPaid back out to the student
    expect(solvency.escrowBalance).toBe(0);
    // What remains owed to the platform is the penalty (as debt receivable)
    expect(solvency.debtReceivable).toBe(penalty);
  });
});
