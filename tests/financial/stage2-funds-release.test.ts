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
import { expectSystemConsistent } from "../helpers/invariants";
import { settleSuborder } from "@/services/orders/suborder-settlement.service";
import { getVendorWalletByVendorId } from "@/lib/db/models/vendor-wallet.model";
import { getTransactionRecordByOrderId } from "@/lib/db/models/transaction-record.model";
import { SuborderFinancialStatus } from "@/enums/financial.enums";

/**
 * Stage 2 — Funds released on delivery confirmation (FUNDS_RELEASED).
 *
 * Drives the REAL production service (`settleSuborder`) rather than a mirror:
 * it is directly callable and is the single shared implementation for all
 * three release triggers (customer confirm, auto-confirm, delivery code).
 *
 * Ledger expectation:
 *   FUNDS_RELEASED: DEBIT VENDOR_PENDING / CREDIT VENDOR_AVAILABLE (settle)
 */
describe("Stage 2 — funds released (pending → available)", () => {
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

  it("moves the settle amount from pending to available and stays consistent", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    const order = await seedPaidOrder({
      suborderGrossAmounts: [500_000],
      vendorIds: [vendorId],
    });
    const suborder = order.suborders[0]!;

    const { withTransaction } = await import("../helpers/test-db");
    const result = await withTransaction((session) =>
      settleSuborder({
        orderId: order.orderId.toString(),
        subOrderId: suborder.suborderId.toString(),
        trigger: "CUSTOMER_CONFIRMATION",
        session,
      }),
    );

    expect(result).toEqual({
      settled: true,
      settleAmount: suborder.settleAmount,
    });

    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    expect(wallet!.balances).toMatchObject({
      pending: 0,
      available: suborder.settleAmount,
      disputed: 0,
      total: suborder.settleAmount,
    });

    const record = await getTransactionRecordByOrderId(order.orderId.toString());
    expect(record!.suborderBreakdowns[0]!.status).toBe(
      SuborderFinancialStatus.SETTLED,
    );

    const solvency = await expectSystemConsistent([vendorId.toString()]);
    // Escrow unchanged — release is a pure reclassification
    expect(solvency.escrowBalance).toBe(order.totalAmount);
    expect(solvency.liabilities.vendorAvailable).toBe(suborder.settleAmount);
    expect(solvency.liabilities.vendorPending).toBe(0);
  });

  it("is idempotent: a second release attempt is a no-op with no extra entries", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    const order = await seedPaidOrder({
      suborderGrossAmounts: [300_000],
      vendorIds: [vendorId],
    });
    const suborder = order.suborders[0]!;
    const { withTransaction } = await import("../helpers/test-db");

    const first = await withTransaction((session) =>
      settleSuborder({
        orderId: order.orderId.toString(),
        subOrderId: suborder.suborderId.toString(),
        trigger: "DELIVERY_CODE",
        session,
      }),
    );
    expect(first.settled).toBe(true);

    // The race that matters at the doorstep: rider code + customer confirm
    const second = await withTransaction((session) =>
      settleSuborder({
        orderId: order.orderId.toString(),
        subOrderId: suborder.suborderId.toString(),
        trigger: "CUSTOMER_CONFIRMATION",
        session,
      }),
    );
    expect(second).toEqual({ settled: false });

    const wallet = await getVendorWalletByVendorId(vendorId.toString());
    // A double release would show available === 2 × settleAmount
    expect(wallet!.balances.available).toBe(suborder.settleAmount);
    expect(wallet!.balances.pending).toBe(0);

    await expectSystemConsistent([vendorId.toString()]);
  });

  it("releasing one suborder of a multi-vendor order leaves the other vendor untouched", async () => {
    const vendorA = new mongoose.Types.ObjectId();
    const vendorB = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorA);
    await seedVendorWallet(vendorB);

    const order = await seedPaidOrder({
      suborderGrossAmounts: [400_000, 250_000],
      vendorIds: [vendorA, vendorB],
    });
    const [subA, subB] = order.suborders;
    const { withTransaction } = await import("../helpers/test-db");

    await withTransaction((session) =>
      settleSuborder({
        orderId: order.orderId.toString(),
        subOrderId: subA!.suborderId.toString(),
        trigger: "AUTO_CONFIRMATION",
        session,
      }),
    );

    const walletA = await getVendorWalletByVendorId(vendorA.toString());
    const walletB = await getVendorWalletByVendorId(vendorB.toString());
    expect(walletA!.balances.available).toBe(subA!.settleAmount);
    expect(walletA!.balances.pending).toBe(0);
    expect(walletB!.balances.available).toBe(0);
    expect(walletB!.balances.pending).toBe(subB!.settleAmount);

    await expectSystemConsistent([vendorA.toString(), vendorB.toString()]);
  });
});
