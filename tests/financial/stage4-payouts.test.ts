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
} from "../helpers/seed";
import {
  expectSystemConsistent,
  expectLedgerHealthy,
} from "../helpers/invariants";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  deductVendorAvailableForPayout,
  reverseVendorPayoutDeduction,
  reduceVendorDebt,
  applyDisputeUpheldDeductions,
  getVendorWalletByVendorId,
} from "@/lib/db/models/vendor-wallet.model";
import {
  calculateWithdrawalFees,
  calculateDebtRecoveryDeduction,
  calculateGatewayFee,
} from "@/lib/utils/withdrawal.utils";
import { checkEscrowSolvency } from "@/lib/utils/reconciliation.util";
import { DebtRecoveryType } from "@/enums/financial.enums";

/**
 * Stage 4 — Payouts.
 *
 * Helpers mirror, call for call, the financial composition of:
 *  - initiation:  src/services/implementations/payout.service.ts:212-268
 *  - completion:  src/services/payment/payout/payout-webhook-handler.service.ts:153-159
 *  - failure:     src/services/payment/payout/payout-webhook-handler.service.ts:232-280
 *
 * Assertions express CORRECT accounting. Where production composition is
 * wrong, these tests fail — that is the finding, not a broken test.
 */

interface InitiatedPayout {
  payoutId: mongoose.Types.ObjectId;
  requestedAmount: number;
  recoveryDeduction: number;
  processingFee: number;
  netAmount: number;
  gatewayFee: number;
}

async function initiatePayout(
  vendorId: mongoose.Types.ObjectId,
  requestedAmount: number,
): Promise<InitiatedPayout> {
  const wallet = await getVendorWalletByVendorId(vendorId.toString());
  const { recoveryDeduction, netPayoutAmount: afterDebtAmount } =
    calculateDebtRecoveryDeduction({
      amount: requestedAmount,
      outstandingDebt: wallet!.debt.amount,
      recoveryType: wallet!.debt.recoveryType,
      recoveryPercentage: wallet!.debt.recoveryPercentage,
    });

  const { totalFee, netAmount } = calculateWithdrawalFees(afterDebtAmount);
  const gatewayFee = calculateGatewayFee(netAmount);

  const payoutId = new mongoose.Types.ObjectId();
  const writer = await JournalEntryWriter.init();

  await withTransaction(async (session) => {
    if (recoveryDeduction > 0) {
      await writer.writeDebtRecovery({
        vendorId,
        recoveredAmount: recoveryDeduction,
        payoutId,
        session,
      });
      await reduceVendorDebt(vendorId.toString(), recoveryDeduction, session);
    }

    if (totalFee > 0) {
      await writer.writePayoutProcessingFee({
        vendorId,
        processingFee: totalFee,
        payoutId,
        session,
      });
      // Mirrors payout.service.ts: fee revenue into the platform wallet cache
      const { creditPlatformCommission } = await import(
        "@/lib/db/models/platform-wallet.model"
      );
      await creditPlatformCommission(totalFee, session);
    }

    await writer.writePayoutInitiated({
      vendorId,
      netPayoutAmount: netAmount,
      payoutId,
      session,
    });

    if (gatewayFee.total > 0) {
      await writer.writeGatewayFee({
        feeAmount: gatewayFee.total,
        payoutId,
        session,
      });
    }

    await deductVendorAvailableForPayout(
      vendorId.toString(),
      requestedAmount,
      session,
    );
  });

  return {
    payoutId,
    requestedAmount,
    recoveryDeduction,
    processingFee: totalFee,
    netAmount,
    gatewayFee: gatewayFee.total,
  };
}

async function completePayout(
  vendorId: mongoose.Types.ObjectId,
  payout: InitiatedPayout,
) {
  const writer = await JournalEntryWriter.init();
  await withTransaction(async (session) => {
    await writer.writePayoutCompleted({
      vendorId,
      netAmount: payout.netAmount,
      payoutId: payout.payoutId,
      session,
    });
  });
}

async function failPayout(
  vendorId: mongoose.Types.ObjectId,
  payout: InitiatedPayout,
) {
  const writer = await JournalEntryWriter.init();
  await withTransaction(async (session) => {
    await writer.writePayoutFailed({
      vendorId,
      requestedAmount: payout.netAmount,
      payoutId: payout.payoutId,
      session,
    });
    if (payout.processingFee > 0) {
      await writer.writePayoutProcessingFeeReversal({
        vendorId,
        processingFee: payout.processingFee,
        payoutId: payout.payoutId,
        session,
      });
      // Mirrors the fixed failure paths: reverse the cache credit too
      const { debitPlatformCommission } = await import(
        "@/lib/db/models/platform-wallet.model"
      );
      await debitPlatformCommission(payout.processingFee, session);
    }
    if (payout.gatewayFee > 0) {
      await writer.writeGatewayFeeReversal({
        feeAmount: payout.gatewayFee,
        payoutId: payout.payoutId,
        session,
      });
    }
    // Mirrors the fixed production composition: restore exactly what the
    // ledger returned (net + processing fee); debt recovery stays recovered.
    await reverseVendorPayoutDeduction(
      vendorId.toString(),
      payout.netAmount + payout.processingFee,
      session,
    );
  });
}

describe("Stage 4 — payouts", () => {
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

  it("initiation: vendor available reduced by full request; ledger, wallets, and platform cache reconcile", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    const order = await seedSettledSuborder({ grossAmount: 2_000_000, vendorId });
    const available = order.suborders[0]!.settleAmount;

    const requested = 1_000_000;
    const payout = await initiatePayout(vendorId, requested);

    expect(payout.recoveryDeduction).toBe(0);
    expect(
      payout.processingFee + payout.netAmount,
      "fee + net must equal the requested amount",
    ).toBe(requested);

    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances.available).toBe(available - requested);

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    // Net amount is in-flight, still platform-controlled
    expect(solvency.payoutProcessing).toBe(payout.netAmount);
    // Escrow reduced only by the gateway fee recorded at initiation
    expect(solvency.escrowBalance).toBe(order.totalAmount - payout.gatewayFee);
  });

  it("completion (findings doc Test B): escrow decreases by exactly the net amount; gateway fee expensed ONCE", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    await seedSettledSuborder({ grossAmount: 2_000_000, vendorId });

    const payout = await initiatePayout(vendorId, 1_000_000);
    const before = await checkEscrowSolvency();

    await completePayout(vendorId, payout);

    const after = await checkEscrowSolvency();

    // Test B's core assertion: cash left the platform, so escrow must DECREASE
    // by the net amount transferred. The gateway fee already left escrow at
    // initiation (writeGatewayFee) — completion must not deduct it again.
    expect(
      after.escrowBalance - before.escrowBalance,
      "escrow change on completion",
    ).toBe(-payout.netAmount);

    // The in-flight account must close to zero
    expect(after.payoutProcessing).toBe(0);

    await expectSystemConsistent([vendorId.toString()]);
  });

  it("failure: vendor restored, fees reversed, wallet cache matches ledger exactly", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);
    const order = await seedSettledSuborder({ grossAmount: 2_000_000, vendorId });
    const available = order.suborders[0]!.settleAmount;

    const payout = await initiatePayout(vendorId, 1_000_000);
    await failPayout(vendorId, payout);

    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    // No debt recovery in this scenario, so the vendor ends exactly where
    // they started.
    expect(wallet!.balances.available).toBe(available);

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.payoutProcessing).toBe(0);
    // Gateway fee reversed — escrow back to the full order gross
    expect(solvency.escrowBalance).toBe(order.totalAmount);

    await expectLedgerHealthy();
  });

  it("initiation with percentage debt recovery: debt reduced, recovery withheld, everything reconciles", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    // Create debt: settle an order, dispute+uphold it with a penalty that
    // exceeds available, under a PERCENTAGE_DEDUCTION policy (20% per payout).
    const disputed = await seedSettledSuborder({
      grossAmount: 500_000,
      vendorId,
    });
    const s = disputed.suborders[0]!;
    const writer = await JournalEntryWriter.init();
    const disputeId = new mongoose.Types.ObjectId();
    const penalty = 100_000;

    await withTransaction(async (session) => {
      await writer.writeDisputeOpened({
        vendorId,
        settleAmount: s.settleAmount,
        disputeId,
        session,
      });
      const { freezeVendorFunds } = await import(
        "@/lib/db/models/vendor-wallet.model"
      );
      await freezeVendorFunds(vendorId.toString(), s.settleAmount, session);
    });

    await withTransaction(async (session) => {
      const deduction = await applyDisputeUpheldDeductions(
        vendorId.toString(),
        s.settleAmount,
        penalty,
        DebtRecoveryType.PERCENTAGE_DEDUCTION,
        20,
        session,
      );
      await writer.writeDisputeUpheld({
        vendorId,
        customerId: disputed.customerId,
        settleAmount: s.settleAmount,
        commission: s.commission,
        penaltyAmount: penalty,
        penaltyFromAvailable: deduction!.penaltyFromAvailable,
        disputeId,
        session,
      });
      const { debitPlatformCommission, creditPlatformPenalty } = await import(
        "@/lib/db/models/platform-wallet.model"
      );
      await debitPlatformCommission(s.commission, session);
      await creditPlatformPenalty(penalty, session);
    });

    // Fresh earnings so there is something to withdraw
    const earning = await seedSettledSuborder({
      grossAmount: 1_000_000,
      vendorId,
    });
    const available = earning.suborders[0]!.settleAmount;

    let wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.debt.amount).toBe(penalty);
    expect(wallet!.debt.recoveryType).toBe(
      DebtRecoveryType.PERCENTAGE_DEDUCTION,
    );

    const requested = 500_000;
    const payout = await initiatePayout(vendorId, requested);
    // 20% of 500,000 = 100,000, capped at the 100,000 debt
    expect(payout.recoveryDeduction).toBe(100_000);
    expect(
      payout.recoveryDeduction + payout.processingFee + payout.netAmount,
    ).toBe(requested);

    wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.debt.amount).toBe(0);
    expect(wallet!.balances.available).toBe(available - requested);

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.debtReceivable).toBe(0); // fully recovered

    // ...and completing it keeps everything consistent
    await completePayout(vendorId, payout);
    await expectSystemConsistent([vendorId.toString()]);
  });

  it("failure of a payout that included debt recovery: recovery sticks, cache still matches ledger", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    // Same debt setup as above, condensed
    const disputed = await seedSettledSuborder({
      grossAmount: 500_000,
      vendorId,
    });
    const s = disputed.suborders[0]!;
    const writer = await JournalEntryWriter.init();
    const disputeId = new mongoose.Types.ObjectId();
    const penalty = 100_000;

    await withTransaction(async (session) => {
      await writer.writeDisputeOpened({
        vendorId,
        settleAmount: s.settleAmount,
        disputeId,
        session,
      });
      const { freezeVendorFunds } = await import(
        "@/lib/db/models/vendor-wallet.model"
      );
      await freezeVendorFunds(vendorId.toString(), s.settleAmount, session);
    });
    await withTransaction(async (session) => {
      const deduction = await applyDisputeUpheldDeductions(
        vendorId.toString(),
        s.settleAmount,
        penalty,
        DebtRecoveryType.PERCENTAGE_DEDUCTION,
        20,
        session,
      );
      await writer.writeDisputeUpheld({
        vendorId,
        customerId: disputed.customerId,
        settleAmount: s.settleAmount,
        commission: s.commission,
        penaltyAmount: penalty,
        penaltyFromAvailable: deduction!.penaltyFromAvailable,
        disputeId,
        session,
      });
      const { debitPlatformCommission, creditPlatformPenalty } = await import(
        "@/lib/db/models/platform-wallet.model"
      );
      await debitPlatformCommission(s.commission, session);
      await creditPlatformPenalty(penalty, session);
    });

    await seedSettledSuborder({ grossAmount: 1_000_000, vendorId });

    const payout = await initiatePayout(vendorId, 500_000);
    expect(payout.recoveryDeduction).toBe(100_000);

    await failPayout(vendorId, payout);

    // The debt was genuinely settled from the vendor's funds at initiation —
    // a failed bank transfer does not undo that. The vendor gets back the
    // net + processing fee; the recovered portion stays recovered.
    // Whatever the intended policy, the wallet cache MUST match the ledger:
    await expectSystemConsistent([vendorId.toString()]);
  });
});
