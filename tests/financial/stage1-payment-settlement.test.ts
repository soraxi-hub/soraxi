import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  startTestDb,
  stopTestDb,
  clearAllCollections,
} from "../helpers/test-db";
import {
  seedVendorWallet,
  seedPlatformWallet,
  seedPaidOrder,
} from "../helpers/seed";
import {
  expectSystemConsistent,
  expectLedgerHealthy,
} from "../helpers/invariants";
import {
  reconcileTransactionRecord,
  checkEscrowSolvency,
} from "@/lib/utils/reconciliation.util";
import { getVendorWalletByVendorId } from "@/lib/db/models/vendor-wallet.model";
import { getPlatformWallet } from "@/lib/db/models/platform-wallet.model";
import { calculateCommission } from "@/lib/utils/calculate-commission";

/**
 * Stage 1 — Student payment confirmed (PAYMENT_RECEIVED + per-suborder
 * VENDOR_SETTLEMENT + optional collection fee).
 *
 * Ledger expectations under the verified conventions:
 *   PAYMENT_RECEIVED:      DEBIT PLATFORM_ESCROW / CREDIT CUSTOMER_REFUND_PAYABLE (gross)
 *   VENDOR_SETTLEMENT ×n:  DEBIT CUSTOMER_REFUND_PAYABLE / CREDIT VENDOR_PENDING + PLATFORM_REVENUE_COMMISSION
 *   COLLECTION_FEE_DEDUCTED: DEBIT GATEWAY_FEES_EXPENSE / CREDIT PLATFORM_ESCROW (collection fee)
 */
describe("Stage 1 — payment received + suborder settlement", () => {
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

  it("single-vendor order: wallets, escrow, and every invariant line up", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    const gross = 500_000; // ₦5,000 → 5% + ₦200 flat fee tier
    const { commission, settleAmount } = calculateCommission(gross);
    expect(settleAmount + commission).toBe(gross);

    const order = await seedPaidOrder({
      suborderGrossAmounts: [gross],
      vendorIds: [vendorId],
    });

    // Vendor wallet cache: settle amount sits in pending
    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances).toMatchObject({
      pending: settleAmount,
      available: 0,
      disputed: 0,
      total: settleAmount,
    });

    // Platform wallet cache: commission recorded
    const platform = await getPlatformWallet();
    expect(platform!.balances).toMatchObject({
      commission,
      penalties: 0,
      total: commission,
    });

    // Escrow holds the full gross (no fees in this scenario)
    const solvency = await expectSystemConsistent([vendorId.toString()]);
    expect(solvency.escrowBalance).toBe(gross);
    expect(solvency.liabilities.vendorPending).toBe(settleAmount);
    expect(solvency.liabilities.customerRefundPayable).toBe(0);
    // Surplus is exactly the platform's earned commission
    expect(solvency.delta).toBe(commission);

    // TransactionRecord breakdowns match the ledger's settlement entries
    const txRecon = await reconcileTransactionRecord(order.orderId.toString());
    expect(txRecon.suborderDiscrepancies).toEqual([]);
    expect(txRecon.isBalanced).toBe(true);
  });

  it("multi-vendor order: per-vendor pending balances and one commission total", async () => {
    const vendorIds = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ];
    for (const id of vendorIds) await seedVendorWallet(id);

    // One from each commission tier: 5%+₦100, 5% only, 5%+₦200
    const grossAmounts = [150_000, 300_000, 800_000];

    const order = await seedPaidOrder({
      suborderGrossAmounts: grossAmounts,
      vendorIds,
    });

    for (const s of order.suborders) {
      const wallet = await getVendorWalletByVendorId(s.vendorId.toString());
      expect(wallet!.balances.pending).toBe(s.settleAmount);
      expect(wallet!.balances.total).toBe(s.settleAmount);
    }

    const platform = await getPlatformWallet();
    expect(platform!.balances.commission).toBe(order.totalCommission);

    const solvency = await expectSystemConsistent(
      vendorIds.map((v) => v.toString()),
    );
    expect(solvency.escrowBalance).toBe(order.totalAmount);
    expect(solvency.delta).toBe(order.totalCommission);

    const txRecon = await reconcileTransactionRecord(order.orderId.toString());
    expect(txRecon.isBalanced).toBe(true);
  });

  it("collection fee reduces escrow and retained earnings by the same amount", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    const gross = 500_000;
    const collectionFeeKobo = 7_525; // 1.4% + VAT, e.g.

    const order = await seedPaidOrder({
      suborderGrossAmounts: [gross],
      vendorIds: [vendorId],
      collectionFeeKobo,
    });

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    // Escrow = gross in, minus the gateway's collection fee
    expect(solvency.escrowBalance).toBe(gross - collectionFeeKobo);
    // Surplus = commission − collection fee expense
    expect(solvency.delta).toBe(order.totalCommission - collectionFeeKobo);
  });

  it("writer rejects a settlement whose amounts do not reconcile", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    const { JournalEntryWriter } = await import(
      "@/services/journal-entry-writer.service"
    );
    const { withTransaction } = await import("../helpers/test-db");
    const { LedgerEntityType } = await import("@/enums/financial.enums");
    void LedgerEntityType;

    const writer = await JournalEntryWriter.init();

    await expect(
      withTransaction(async (session) => {
        await writer.writeSuborderSettlement({
          vendorId,
          customerId: new mongoose.Types.ObjectId(),
          settleAmount: 90_000,
          commission: 5_000,
          amountPaid: 100_000, // 90k + 5k ≠ 100k
          suborderId: new mongoose.Types.ObjectId(),
          session,
        });
      }),
    ).rejects.toThrow(/do not reconcile/i);

    // Nothing must have been written
    await expectLedgerHealthy();
    const solvency = await checkEscrowSolvency();
    expect(solvency.escrowBalance).toBe(0);
  });
});
