import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  startTestDb,
  stopTestDb,
  clearAllCollections,
} from "../helpers/test-db";
import { seedVendorWallet, seedPlatformWallet, seedPaidOrder } from "../helpers/seed";
import { expectSystemConsistent } from "../helpers/invariants";
import { checkCollectionsByGateway } from "@/lib/utils/reconciliation.util";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import { withTransaction } from "../helpers/test-db";
import { PaymentGateway } from "@/enums";
import {
  LedgerAccountType,
  LedgerEntryCategory,
  LedgerEntryType,
  LedgerReferenceType,
} from "@/enums/financial.enums";

/**
 * Per-gateway collections slicing.
 *
 * This is the internal half of the two-layer reconciliation: what OUR ledger
 * says each provider collected on our behalf, ready to be compared against
 * that provider's own settlement report.
 *
 * The property that matters is attribution: money must land against the
 * gateway it actually moved through, and money that moved without a recorded
 * gateway must be surfaced rather than silently folded into a total.
 */
// One database for the whole file: a second describe starting its own replica
// set would tear the connection out from under the first.
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

describe("checkCollectionsByGateway", () => {
  it("reports nothing when no payments have been collected", async () => {
    const result = await checkCollectionsByGateway();

    expect(result.perGateway).toEqual([]);
    expect(result.totalNetCollected).toBe(0);
    expect(result.untaggedCollectionsEscrow).toBe(0);
  });

  it("attributes a payment and its collection fee to the collecting gateway", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    const gross = 500_000;
    const collectionFeeKobo = 7_525;

    await seedPaidOrder({
      suborderGrossAmounts: [gross],
      vendorIds: [vendorId],
      collectionFeeKobo,
      gateway: PaymentGateway.Flutterwave,
    });

    const result = await checkCollectionsByGateway();

    expect(result.perGateway).toHaveLength(1);
    const position = result.perGateway[0]!;
    expect(position.gateway).toBe(PaymentGateway.Flutterwave);
    expect(position.paymentsIn).toBe(gross);
    expect(position.collectionFees).toBe(collectionFeeKobo);
    expect(position.refundsOut).toBe(0);
    expect(position.netCollected).toBe(gross - collectionFeeKobo);
    expect(result.untaggedCollectionsEscrow).toBe(0);

    // Slicing the ledger must not disturb it.
    await expectSystemConsistent([vendorId.toString()]);
  });

  it("keeps two gateways separate rather than pooling them", async () => {
    const vendorA = new mongoose.Types.ObjectId();
    const vendorB = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorA);
    await seedVendorWallet(vendorB);

    await seedPaidOrder({
      suborderGrossAmounts: [500_000],
      vendorIds: [vendorA],
      collectionFeeKobo: 7_525,
      gateway: PaymentGateway.Flutterwave,
    });
    await seedPaidOrder({
      suborderGrossAmounts: [300_000],
      vendorIds: [vendorB],
      collectionFeeKobo: 5_000,
      gateway: PaymentGateway.Paystack,
    });

    const result = await checkCollectionsByGateway();

    expect(result.perGateway).toHaveLength(2);

    const flutterwave = result.perGateway.find(
      (p) => p.gateway === PaymentGateway.Flutterwave,
    )!;
    const paystack = result.perGateway.find(
      (p) => p.gateway === PaymentGateway.Paystack,
    )!;

    // The whole point: a Paystack payment must never inflate the Flutterwave
    // position, or the settlement comparison would fail against both.
    expect(flutterwave.paymentsIn).toBe(500_000);
    expect(flutterwave.collectionFees).toBe(7_525);
    expect(flutterwave.netCollected).toBe(500_000 - 7_525);

    expect(paystack.paymentsIn).toBe(300_000);
    expect(paystack.collectionFees).toBe(5_000);
    expect(paystack.netCollected).toBe(300_000 - 5_000);

    expect(result.totalNetCollected).toBe(
      flutterwave.netCollected + paystack.netCollected,
    );

    await expectSystemConsistent([vendorA.toString(), vendorB.toString()]);
  });

  it("surfaces escrow movement that was recorded without a gateway", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    await seedPaidOrder({
      suborderGrossAmounts: [500_000],
      vendorIds: [vendorId],
      gateway: PaymentGateway.Flutterwave,
    });

    // Simulate a payment written by a path that forgot the gateway. The
    // writer requires it today, so this is reached by writing the line
    // directly — which is exactly the drift this counter exists to catch.
    const LedgerLine = mongoose.connection.collection("ledgerlines");
    const JournalEntry = mongoose.connection.collection("journalentries");
    const journal = await JournalEntry.insertOne({
      category: LedgerEntryCategory.PAYMENT_RECEIVED,
      referenceType: LedgerReferenceType.SUBORDER,
      referenceId: new mongoose.Types.ObjectId(),
      description: "untagged payment",
      metadata: {},
      createdAt: new Date(),
    });
    await LedgerLine.insertOne({
      journalId: journal.insertedId,
      type: LedgerEntryType.DEBIT,
      accountType: LedgerAccountType.PLATFORM_ESCROW,
      amount: 12_345,
      createdAt: new Date(),
    });

    const result = await checkCollectionsByGateway();

    // The tagged position is unaffected...
    const flutterwave = result.perGateway.find(
      (p) => p.gateway === PaymentGateway.Flutterwave,
    )!;
    expect(flutterwave.paymentsIn).toBe(500_000);

    // ...and the unattributable movement is reported rather than absorbed.
    expect(result.untaggedCollectionsEscrow).toBe(12_345);
  });

  it("subtracts a refund from the gateway that returned it", async () => {
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    const order = await seedPaidOrder({
      suborderGrossAmounts: [500_000],
      vendorIds: [vendorId],
      gateway: PaymentGateway.Paystack,
    });

    const writer = await JournalEntryWriter.init();
    await withTransaction(async (session) => {
      await writer.writeRefundConfirmed({
        customerId: order.customerId,
        amountRefunded: 200_000,
        refundId: new mongoose.Types.ObjectId(),
        gatewayProvider: PaymentGateway.Paystack,
        session,
      });
    });

    const result = await checkCollectionsByGateway();
    const paystack = result.perGateway.find(
      (p) => p.gateway === PaymentGateway.Paystack,
    )!;

    expect(paystack.paymentsIn).toBe(500_000);
    expect(paystack.refundsOut).toBe(200_000);
    expect(paystack.netCollected).toBe(300_000);
  });
});

describe("checkCollectionsByGateway — payout fees stay out of collections", () => {
  it("ignores a payout transfer fee, which posts identical ledger lines", async () => {
    // writeGatewayFee (payout transfer charge) and writeCollectionFee
    // (collection charge) post byte-identical ledger lines: same accounts,
    // same direction, same amount shape. Only their CATEGORY separates them,
    // and they shared one until COLLECTION_FEE_DEDUCTED and
    // TRANSFER_FEE_DEDUCTED were split apart.
    //
    // While they shared it, every payout fee fell through to
    // untaggedCollectionsEscrow, and the nightly cron reported a gateway
    // attribution discrepancy after each valid payout. This test is what
    // stops the two categories being merged back together.
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    await seedPaidOrder({
      suborderGrossAmounts: [500_000],
      vendorIds: [vendorId],
      collectionFeeKobo: 7_525,
      gateway: PaymentGateway.Flutterwave,
    });

    const writer = await JournalEntryWriter.init();
    await withTransaction(async (session) => {
      await writer.writeGatewayFee({
        feeAmount: 5_375,
        payoutId: new mongoose.Types.ObjectId(),
        session,
      });
    });

    const result = await checkCollectionsByGateway();

    const flutterwave = result.perGateway.find(
      (p) => p.gateway === PaymentGateway.Flutterwave,
    )!;

    // Only the COLLECTION fee counts against collections.
    expect(flutterwave.collectionFees).toBe(7_525);
    expect(flutterwave.netCollected).toBe(500_000 - 7_525);

    // And the payout fee must not be mistaken for unattributable collections
    // cash — that would make the cron cry wolf on every single payout.
    expect(result.untaggedCollectionsEscrow).toBe(0);
  });

  it("files the two fees under distinct categories", async () => {
    // The guard above is behavioural; this one is structural. If someone ever
    // points both writers at one category again, this fails immediately and
    // names the reason, rather than surfacing as a puzzling cron alert weeks
    // later.
    const vendorId = new mongoose.Types.ObjectId();
    await seedVendorWallet(vendorId);

    await seedPaidOrder({
      suborderGrossAmounts: [500_000],
      vendorIds: [vendorId],
      collectionFeeKobo: 7_525,
      gateway: PaymentGateway.Flutterwave,
    });

    const writer = await JournalEntryWriter.init();
    await withTransaction(async (session) => {
      await writer.writeGatewayFee({
        feeAmount: 5_375,
        payoutId: new mongoose.Types.ObjectId(),
        session,
      });
    });

    const JournalEntry = mongoose.connection.collection("journalentries");

    const collectionFees = await JournalEntry.countDocuments({
      category: LedgerEntryCategory.COLLECTION_FEE_DEDUCTED,
    });
    const transferFees = await JournalEntry.countDocuments({
      category: LedgerEntryCategory.TRANSFER_FEE_DEDUCTED,
    });

    expect(collectionFees).toBe(1);
    expect(transferFees).toBe(1);
  });
});
