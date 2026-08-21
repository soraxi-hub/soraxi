import crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  normalizePaystackVerifyResponse,
  parsePaystackMetadata,
  isPaystackNotFound,
  verifyPaystackSignature,
  type PaystackVerifyResponse,
  type PaystackTransactionData,
  type PaystackTransactionStatus,
} from "@/domain/payment/gateways/paystack.gateway";
import { NormalizedPaymentStatus } from "@/domain/payment/gateways/gateway-interface";
import { PaymentGateway } from "@/enums";

/**
 * Fixture-driven tests for the Paystack adapter. The live integration is
 * unverified until credentials are issued, so these pin the mapping against
 * Paystack's documented payload shapes - especially the two places it
 * diverges from Flutterwave: Kobo-native amounts and VAT-inclusive fees.
 */

function makeVerifyResponse(
  overrides: Partial<PaystackTransactionData> = {},
  envelopeStatus = true,
): PaystackVerifyResponse {
  return {
    status: envelopeStatus,
    message: "Verification successful",
    data: {
      id: 3209384123,
      domain: "test",
      status: "success",
      reference: "idem-key-abc123",
      amount: 500_000, // Kobo - Paystack is Kobo-native
      message: null,
      gateway_response: "Successful",
      paid_at: "2026-08-12T10:00:05.000Z",
      created_at: "2026-08-12T10:00:00.000Z",
      channel: "card",
      currency: "NGN",
      ip_address: "102.89.23.1",
      fees: 7_600, // Kobo, VAT-inclusive
      metadata: {
        orderId: "66b9f0a1c2d3e4f5a6b7c8d9",
        idempotencyKey: "idem-key-abc123",
        fullName: "Ada Obi",
        phone_number: "+2348012345678",
        email: "student@school.edu.ng",
      },
      customer: {
        id: 88123,
        email: "student@school.edu.ng",
        customer_code: "CUS_test123",
        first_name: "Ada",
        last_name: "Obi",
        phone: "+2348012345678",
      },
      ...overrides,
    },
  };
}

describe("normalizePaystackVerifyResponse", () => {
  it("maps a successful transaction without converting units - Paystack is Kobo-native", () => {
    const result = normalizePaystackVerifyResponse(makeVerifyResponse());

    expect(result).not.toBeNull();
    expect(result!.provider).toBe(PaymentGateway.Paystack);
    expect(result!.status).toBe(NormalizedPaymentStatus.Successful);
    expect(result!.rawStatus).toBe("success");
    // The fixture's 500_000 is already Kobo - it must pass through untouched.
    // A Naira-style conversion here would produce 50_000_000.
    expect(result!.amountKobo).toBe(500_000);
    expect(result!.currency).toBe("NGN");
    // Paystack fees are VAT-inclusive: no 7.5% is added on top.
    expect(result!.collectionFeeKobo).toBe(7_600);
    expect(result!.gatewayTransactionId).toBe("3209384123");
    expect(result!.reference).toBe("idem-key-abc123");
    expect(result!.paymentMethod).toBe("card");
    expect(result!.meta).toEqual({
      orderId: "66b9f0a1c2d3e4f5a6b7c8d9",
      idempotencyKey: "idem-key-abc123",
      email: "student@school.edu.ng",
      phoneNumber: "+2348012345678",
      fullName: "Ada Obi",
    });
  });

  it("maps in-flight statuses to Pending", () => {
    for (const status of [
      "pending",
      "ongoing",
      "processing",
      "queued",
    ] as PaystackTransactionStatus[]) {
      const result = normalizePaystackVerifyResponse(
        makeVerifyResponse({ status }),
      );
      expect(result!.status).toBe(NormalizedPaymentStatus.Pending);
      expect(result!.rawStatus).toBe(status);
    }
  });

  it("maps failed, abandoned and reversed to Failed while preserving raw status", () => {
    for (const status of [
      "failed",
      "abandoned",
      "reversed",
    ] as PaystackTransactionStatus[]) {
      const result = normalizePaystackVerifyResponse(
        makeVerifyResponse({ status }),
      );
      expect(result!.status).toBe(NormalizedPaymentStatus.Failed);
      // Abandoned must stay distinguishable from failed downstream.
      expect(result!.rawStatus).toBe(status);
    }
  });

  it("handles metadata returned as a JSON string", () => {
    const response = makeVerifyResponse({
      metadata: JSON.stringify({
        orderId: "66b9f0a1c2d3e4f5a6b7c8d9",
        idempotencyKey: "idem-key-abc123",
        fullName: "Ada Obi",
        phone_number: "+2348012345678",
        email: "student@school.edu.ng",
      }),
    });

    const result = normalizePaystackVerifyResponse(response);
    expect(result!.meta.orderId).toBe("66b9f0a1c2d3e4f5a6b7c8d9");
    expect(result!.meta.fullName).toBe("Ada Obi");
  });

  it("falls back to customer fields and the reference when metadata is missing", () => {
    const result = normalizePaystackVerifyResponse(
      makeVerifyResponse({ metadata: "" }),
    );

    // orderId cannot be recovered - the caller rejects on the empty value
    // rather than the adapter inventing one.
    expect(result!.meta.orderId).toBe("");
    // The reference IS the idempotency key, so it survives metadata loss.
    expect(result!.meta.idempotencyKey).toBe("idem-key-abc123");
    expect(result!.meta.email).toBe("student@school.edu.ng");
    expect(result!.meta.fullName).toBe("Ada Obi");
    expect(result!.meta.phoneNumber).toBe("+2348012345678");
  });

  it("treats a null fee as zero", () => {
    const result = normalizePaystackVerifyResponse(
      makeVerifyResponse({ fees: null }),
    );
    expect(result!.collectionFeeKobo).toBe(0);
  });

  it("returns null when the envelope status is false", () => {
    expect(
      normalizePaystackVerifyResponse(makeVerifyResponse({}, false)),
    ).toBeNull();
  });

  it("keeps the full raw response for audit", () => {
    const response = makeVerifyResponse();
    expect(normalizePaystackVerifyResponse(response)!.raw).toBe(response);
  });
});

describe("isPaystackNotFound", () => {
  it("treats a 404 as definitive, whatever the body says", () => {
    expect(isPaystackNotFound(404, null)).toBe(true);
    expect(
      isPaystackNotFound(404, { status: false, message: "anything" }),
    ).toBe(true);
  });

  it("recognises not-found wording delivered with another status code", () => {
    for (const message of [
      "Transaction not found",
      "Transaction reference not found",
      "Invalid transaction reference",
    ]) {
      expect(isPaystackNotFound(400, { status: false, message })).toBe(true);
    }
  });

  it("does not treat other failures as not-found", () => {
    // Must stay transient - cancelling on an outage would kill live payments.
    for (const message of [
      "Invalid key",
      "Service unavailable",
      "Too many requests",
    ]) {
      expect(isPaystackNotFound(500, { status: false, message })).toBe(false);
    }
  });

  it("does not treat a successful response as not-found", () => {
    expect(
      isPaystackNotFound(200, {
        status: true,
        message: "Verification successful",
      }),
    ).toBe(false);
  });
});

describe("parsePaystackMetadata", () => {
  it("passes objects through", () => {
    const meta = { orderId: "abc" } as never;
    expect(parsePaystackMetadata(meta)).toEqual({ orderId: "abc" });
  });

  it("returns an empty object for null, empty string and malformed JSON", () => {
    expect(parsePaystackMetadata(null)).toEqual({});
    expect(parsePaystackMetadata("")).toEqual({});
    expect(parsePaystackMetadata("{not json")).toEqual({});
    // A JSON scalar is valid JSON but not a metadata object.
    expect(parsePaystackMetadata("42")).toEqual({});
  });
});

describe("verifyPaystackSignature", () => {
  const secretKey = "sk_test_secret";
  const rawBody = JSON.stringify({
    event: "charge.success",
    data: { reference: "idem-key-abc123" },
  });

  function sign(body: string, key = secretKey): string {
    return crypto.createHmac("sha512", key).update(body, "utf8").digest("hex");
  }

  it("accepts a correctly signed body", () => {
    expect(
      verifyPaystackSignature({
        rawBody,
        signature: sign(rawBody),
        secretKey,
      }),
    ).toBe(true);
  });

  it("rejects a body that was modified after signing", () => {
    const signature = sign(rawBody);
    const tampered = rawBody.replace("idem-key-abc123", "idem-key-evil999");

    expect(
      verifyPaystackSignature({ rawBody: tampered, signature, secretKey }),
    ).toBe(false);
  });

  it("rejects a signature produced with the wrong key", () => {
    expect(
      verifyPaystackSignature({
        rawBody,
        signature: sign(rawBody, "sk_test_wrong"),
        secretKey,
      }),
    ).toBe(false);
  });

  it("rejects a missing signature, and a missing secret", () => {
    expect(
      verifyPaystackSignature({ rawBody, signature: null, secretKey }),
    ).toBe(false);
    expect(
      verifyPaystackSignature({
        rawBody,
        signature: sign(rawBody),
        secretKey: "",
      }),
    ).toBe(false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on length mismatch - the guard must short-circuit.
    expect(() =>
      verifyPaystackSignature({ rawBody, signature: "abc123", secretKey }),
    ).not.toThrow();
    expect(
      verifyPaystackSignature({ rawBody, signature: "abc123", secretKey }),
    ).toBe(false);
  });
});
