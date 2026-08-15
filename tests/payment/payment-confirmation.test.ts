import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import {
  startTestDb,
  stopTestDb,
  clearAllCollections,
} from "../helpers/test-db";
import { seedPendingOrder, seedPlatformWallet } from "../helpers/seed";
import { PaymentConfirmationService } from "@/services/payment/payment-confirmation.service";
import { PaymentService } from "@/services/payment/payment.service";
import {
  NormalizedPaymentStatus,
  type PaymentVerificationResult,
} from "@/domain/payment/gateways/gateway-interface";
import { getOrderModel } from "@/lib/db/models/order.model";
import { PaymentGateway, PaymentStatus } from "@/enums";

/**
 * PaymentConfirmationService is the single path through which a gateway's
 * verdict becomes financial truth — shared by both webhooks, the status-page
 * fallback and the cron sweep. These tests pin its state machine and its
 * guards; the ledger composition of a successful payment is covered by the
 * Stage 1-5 financial suites.
 *
 * The gateway itself is stubbed: what matters here is how a given verdict is
 * turned into an order state, not how each provider's payload is parsed
 * (that is the adapter suites' job).
 */

const REFERENCE = "idem-key-confirm-001";

function verificationResult(
  overrides: Partial<PaymentVerificationResult> = {},
): PaymentVerificationResult {
  return {
    provider: PaymentGateway.Flutterwave,
    status: NormalizedPaymentStatus.Successful,
    rawStatus: "successful",
    amountKobo: 500_000,
    currency: "NGN",
    collectionFeeKobo: 7_525,
    gatewayTransactionId: "8471234",
    reference: REFERENCE,
    paymentMethod: "card",
    meta: {
      orderId: "",
      idempotencyKey: REFERENCE,
      email: "student@school.edu.ng",
      phoneNumber: "+2348012345678",
      fullName: "Ada Obi",
    },
    raw: {},
    ...overrides,
  };
}

/** Stub the gateway round trip with a fixed verdict. */
function stubVerify(result: PaymentVerificationResult | null) {
  return vi.spyOn(PaymentService, "verifyPayment").mockResolvedValue(result);
}

async function readStatus(reference: string): Promise<PaymentStatus> {
  const Order = await getOrderModel();
  const order = await Order.findOne({ idempotencyKey: reference })
    .select("paymentStatus")
    .lean<{ paymentStatus: PaymentStatus }>();
  return order!.paymentStatus;
}

// One database for the whole file: each describe starting its own replica set
// would tear the connection out from under the other.
beforeAll(async () => {
  await startTestDb();
});

afterAll(async () => {
  await stopTestDb();
});

beforeEach(async () => {
  await clearAllCollections();
  await seedPlatformWallet();
  vi.restoreAllMocks();
});

describe("PaymentConfirmationService.confirmFromGateway", () => {
  it("returns an error when no order matches the reference", async () => {
    const spy = stubVerify(verificationResult());

    const result = await PaymentConfirmationService.confirmFromGateway({
      reference: "does-not-exist",
    });

    expect(result.ok).toBe(false);
    // No gateway call is made for an unknown reference.
    expect(spy).not.toHaveBeenCalled();
  });

  it("short-circuits an already-settled order without calling the gateway", async () => {
    await seedPendingOrder({
      reference: REFERENCE,
      paymentStatus: PaymentStatus.Paid,
    });
    const spy = stubVerify(verificationResult());

    const result = await PaymentConfirmationService.confirmFromGateway({
      reference: REFERENCE,
    });

    expect(result).toMatchObject({ ok: true, status: PaymentStatus.Paid });
    // This is what makes a webhook racing the status-page fallback safe.
    expect(spy).not.toHaveBeenCalled();
  });

  it("leaves the order pending when the gateway is still processing", async () => {
    await seedPendingOrder({ reference: REFERENCE });
    stubVerify(
      verificationResult({
        status: NormalizedPaymentStatus.Pending,
        rawStatus: "pending",
      }),
    );

    const result = await PaymentConfirmationService.confirmFromGateway({
      reference: REFERENCE,
    });

    expect(result).toMatchObject({ ok: true, status: PaymentStatus.Pending });
    await expect(readStatus(REFERENCE)).resolves.toBe(PaymentStatus.Pending);
  });

  it('marks the order Failed on a hard "failed" verdict', async () => {
    await seedPendingOrder({ reference: REFERENCE });
    stubVerify(
      verificationResult({
        status: NormalizedPaymentStatus.Failed,
        rawStatus: "failed",
      }),
    );

    const result = await PaymentConfirmationService.confirmFromGateway({
      reference: REFERENCE,
    });

    expect(result).toMatchObject({ ok: true, status: PaymentStatus.Failed });
    await expect(readStatus(REFERENCE)).resolves.toBe(PaymentStatus.Failed);
  });

  it("marks the order Cancelled when the customer abandoned checkout", async () => {
    await seedPendingOrder({ reference: REFERENCE });
    stubVerify(
      verificationResult({
        status: NormalizedPaymentStatus.Failed,
        rawStatus: "abandoned",
      }),
    );

    const result = await PaymentConfirmationService.confirmFromGateway({
      reference: REFERENCE,
    });

    expect(result).toMatchObject({ ok: true, status: PaymentStatus.Cancelled });
    await expect(readStatus(REFERENCE)).resolves.toBe(PaymentStatus.Cancelled);
  });

  it("never walks back a paid order on a late failed verdict", async () => {
    // The regression this guards: a stale verify (cron sweep, retried webhook)
    // arriving after the payment settled must not flip Paid → Failed.
    await seedPendingOrder({
      reference: REFERENCE,
      paymentStatus: PaymentStatus.Paid,
    });
    stubVerify(
      verificationResult({
        status: NormalizedPaymentStatus.Failed,
        rawStatus: "failed",
      }),
    );

    await PaymentConfirmationService.confirmFromGateway({
      reference: REFERENCE,
    });

    await expect(readStatus(REFERENCE)).resolves.toBe(PaymentStatus.Paid);
  });

  it("reports an error, without writing, when the gateway cannot be reached", async () => {
    await seedPendingOrder({ reference: REFERENCE });
    stubVerify(null);

    const result = await PaymentConfirmationService.confirmFromGateway({
      reference: REFERENCE,
    });

    expect(result.ok).toBe(false);
    await expect(readStatus(REFERENCE)).resolves.toBe(PaymentStatus.Pending);
  });

  it("verifies against the gateway recorded on the order", async () => {
    await seedPendingOrder({
      reference: REFERENCE,
      gateway: PaymentGateway.Paystack,
    });
    const spy = stubVerify(
      verificationResult({
        status: NormalizedPaymentStatus.Pending,
        rawStatus: "pending",
      }),
    );

    await PaymentConfirmationService.confirmFromGateway({
      reference: REFERENCE,
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ gateway: PaymentGateway.Paystack }),
    );
  });

  it("rejects a successful verification whose metadata has no orderId", async () => {
    await seedPendingOrder({ reference: REFERENCE });
    stubVerify(verificationResult()); // meta.orderId is "" in the fixture

    const result = await PaymentConfirmationService.confirmFromGateway({
      reference: REFERENCE,
    });

    expect(result.ok).toBe(false);
    await expect(readStatus(REFERENCE)).resolves.toBe(PaymentStatus.Pending);
  });
});

describe("PaymentConfirmationService.sweepStalePendingOrders", () => {
  it("skips orders younger than the cutoff so it never races a live checkout", async () => {
    await seedPendingOrder({ reference: "fresh-order" });
    const spy = stubVerify(verificationResult());

    const summary = await PaymentConfirmationService.sweepStalePendingOrders({
      olderThanMinutes: 15,
    });

    expect(summary.totalEligible).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it("picks up stale pending orders and settles them", async () => {
    const staleDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour old
    await seedPendingOrder({ reference: "stale-order", createdAt: staleDate });
    stubVerify(
      verificationResult({
        status: NormalizedPaymentStatus.Failed,
        rawStatus: "abandoned",
      }),
    );

    const summary = await PaymentConfirmationService.sweepStalePendingOrders({
      olderThanMinutes: 15,
    });

    expect(summary.totalEligible).toBe(1);
    expect(summary.failed).toBe(1);
    await expect(readStatus("stale-order")).resolves.toBe(
      PaymentStatus.Cancelled,
    );
  });

  it("ignores orders that already reached a terminal state", async () => {
    const staleDate = new Date(Date.now() - 60 * 60 * 1000);
    await seedPendingOrder({
      reference: "settled-order",
      createdAt: staleDate,
      paymentStatus: PaymentStatus.Paid,
    });
    stubVerify(verificationResult());

    const summary = await PaymentConfirmationService.sweepStalePendingOrders({
      olderThanMinutes: 15,
    });

    expect(summary.totalEligible).toBe(0);
  });

  it("counts a still-processing order without changing it", async () => {
    const staleDate = new Date(Date.now() - 60 * 60 * 1000);
    await seedPendingOrder({ reference: "in-flight", createdAt: staleDate });
    stubVerify(
      verificationResult({
        status: NormalizedPaymentStatus.Pending,
        rawStatus: "pending",
      }),
    );

    const summary = await PaymentConfirmationService.sweepStalePendingOrders({
      olderThanMinutes: 15,
    });

    expect(summary.stillPending).toBe(1);
    await expect(readStatus("in-flight")).resolves.toBe(PaymentStatus.Pending);
  });

  it("keeps sweeping after one order errors", async () => {
    const staleDate = new Date(Date.now() - 60 * 60 * 1000);
    await seedPendingOrder({ reference: "err-1", createdAt: staleDate });
    await seedPendingOrder({ reference: "err-2", createdAt: staleDate });

    vi.spyOn(PaymentService, "verifyPayment")
      .mockRejectedValueOnce(new Error("gateway exploded"))
      .mockResolvedValueOnce(
        verificationResult({
          status: NormalizedPaymentStatus.Failed,
          rawStatus: "failed",
        }),
      );

    const summary = await PaymentConfirmationService.sweepStalePendingOrders({
      olderThanMinutes: 15,
    });

    expect(summary.totalEligible).toBe(2);
    expect(summary.errored).toBe(1);
    expect(summary.failed).toBe(1);
  });
});
