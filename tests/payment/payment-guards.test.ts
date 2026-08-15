import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateChargedAmount } from "@/services/orders/process-order.service";
import { GatewayRouter } from "@/domain/payment/gateway-routing";
import { PaymentGateway } from "@/enums";

describe("validateChargedAmount", () => {
  it("accepts an exact payment", () => {
    expect(
      validateChargedAmount({
        expectedKobo: 500_000,
        chargedKobo: 500_000,
        currency: "NGN",
      }),
    ).toEqual({ ok: true });
  });

  it("accepts an overpayment (never blocks fulfilment)", () => {
    expect(
      validateChargedAmount({
        expectedKobo: 500_000,
        chargedKobo: 500_100,
        currency: "NGN",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects an underpayment — even by one Kobo", () => {
    const result = validateChargedAmount({
      expectedKobo: 500_000,
      chargedKobo: 499_999,
      currency: "NGN",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/underpayment/i);
  });

  it("rejects a currency mismatch regardless of amount", () => {
    const result = validateChargedAmount({
      expectedKobo: 500_000,
      chargedKobo: 500_000,
      currency: "USD",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/currency/i);
  });
});

describe("GatewayRouter.candidateGateways", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
    savedEnv.PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  });

  afterEach(() => {
    if (savedEnv.FLUTTERWAVE_SECRET_KEY === undefined) {
      delete process.env.FLUTTERWAVE_SECRET_KEY;
    } else {
      process.env.FLUTTERWAVE_SECRET_KEY = savedEnv.FLUTTERWAVE_SECRET_KEY;
    }
    if (savedEnv.PAYSTACK_SECRET_KEY === undefined) {
      delete process.env.PAYSTACK_SECRET_KEY;
    } else {
      process.env.PAYSTACK_SECRET_KEY = savedEnv.PAYSTACK_SECRET_KEY;
    }
  });

  it("returns Flutterwave as the sole candidate when only it is configured", () => {
    process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST";
    delete process.env.PAYSTACK_SECRET_KEY;

    expect(GatewayRouter.candidateGateways()).toEqual([
      PaymentGateway.Flutterwave,
    ]);
  });

  it("never routes checkouts to Paystack, even with its key deployed", () => {
    // Paystack is gated off in BOTH isConfigured and isRoutable while the
    // integration is unfinished. Deploying a key to test the webhook must not
    // expose live customers to it — including as a silent failover target
    // when Flutterwave errors.
    process.env.FLUTTERWAVE_SECRET_KEY = "FLWSECK_TEST";
    process.env.PAYSTACK_SECRET_KEY = "sk_test_paystack";

    expect(GatewayRouter.candidateGateways()).toEqual([
      PaymentGateway.Flutterwave,
    ]);
  });

  it("throws rather than silently routing to Paystack when Flutterwave is unconfigured", () => {
    // With Paystack gated off there is no usable gateway left, so checkout
    // must fail loudly instead of quietly reaching for the unfinished one.
    delete process.env.FLUTTERWAVE_SECRET_KEY;
    process.env.PAYSTACK_SECRET_KEY = "sk_test_paystack";

    expect(() => GatewayRouter.candidateGateways()).toThrow(
      /no payment gateway/i,
    );
  });

  it("throws when no gateway is configured — checkout cannot proceed silently", () => {
    delete process.env.FLUTTERWAVE_SECRET_KEY;
    delete process.env.PAYSTACK_SECRET_KEY;

    expect(() => GatewayRouter.candidateGateways()).toThrow(
      /no payment gateway/i,
    );
  });
});
