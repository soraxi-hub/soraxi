import { describe, it, expect } from "vitest";
import {
  normalizeFlutterwaveVerifyResponse,
  type FlutterwaveVerifyResponse,
  type FlutterwaveTransactionData,
} from "@/domain/payment/gateways/flutterwave.gateway";
import { NormalizedPaymentStatus } from "@/domain/payment/gateways/gateway-interface";
import { PaymentGateway } from "@/enums";

/**
 * Unit tests for the Flutterwave → neutral mapping. This mapping is the seam
 * the whole multi-gateway design rests on: unit conversion (Flutterwave
 * reports Naira, the platform works in Kobo), fee + VAT arithmetic, and
 * status normalization all live here and nowhere else.
 */

function makeVerifyResponse(
  overrides: Partial<FlutterwaveTransactionData> = {},
  envelopeStatus: "success" | "error" = "success",
): FlutterwaveVerifyResponse {
  return {
    status: envelopeStatus,
    message: "Transaction fetched successfully",
    data: {
      id: 8471234,
      tx_ref: "idem-key-abc123",
      flw_ref: "FLW-MOCK-REF",
      amount: 5000, // Naira
      currency: "NGN",
      charged_amount: 5000, // Naira
      app_fee: 70, // Naira (1.4%)
      amount_settled: 4930,
      merchant_fee: 0,
      processor_response: "Approved",
      status: "successful",
      payment_type: "card",
      created_at: "2026-08-12T10:00:00.000Z",
      meta: {
        email: "student@school.edu.ng",
        phone_number: "+2348012345678",
        fullName: "Ada Obi",
        orderId: "66b9f0a1c2d3e4f5a6b7c8d9",
        idempotencyKey: "idem-key-abc123",
      },
      ...overrides,
    },
  };
}

describe("normalizeFlutterwaveVerifyResponse", () => {
  it("maps a successful transaction: Naira→Kobo amounts, fee + 7.5% VAT, meta, stringified id", () => {
    const result = normalizeFlutterwaveVerifyResponse(makeVerifyResponse());

    expect(result).not.toBeNull();
    expect(result!.provider).toBe(PaymentGateway.Flutterwave);
    expect(result!.status).toBe(NormalizedPaymentStatus.Successful);
    expect(result!.rawStatus).toBe("successful");
    expect(result!.amountKobo).toBe(500_000); // ₦5,000
    expect(result!.currency).toBe("NGN");
    // app_fee ₦70 → 7,000 Kobo, + 7.5% VAT (525 Kobo) = 7,525 Kobo
    expect(result!.collectionFeeKobo).toBe(7_525);
    expect(result!.gatewayTransactionId).toBe("8471234");
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

  it('treats "success" and "completed" provider statuses as Successful', () => {
    for (const status of ["success", "completed"] as const) {
      const result = normalizeFlutterwaveVerifyResponse(
        makeVerifyResponse({ status: status as FlutterwaveTransactionData["status"] }),
      );
      expect(result!.status).toBe(NormalizedPaymentStatus.Successful);
    }
  });

  it("maps a pending transaction to Pending", () => {
    const result = normalizeFlutterwaveVerifyResponse(
      makeVerifyResponse({ status: "pending" }),
    );
    expect(result!.status).toBe(NormalizedPaymentStatus.Pending);
    expect(result!.rawStatus).toBe("pending");
  });

  it("maps failed and unknown statuses to Failed but preserves the raw status", () => {
    const failed = normalizeFlutterwaveVerifyResponse(
      makeVerifyResponse({ status: "failed" }),
    );
    expect(failed!.status).toBe(NormalizedPaymentStatus.Failed);
    expect(failed!.rawStatus).toBe("failed");

    // Cancelled/abandoned flows must stay distinguishable from failed —
    // updateOrderRecordToFailureState branches on the raw string.
    const cancelled = normalizeFlutterwaveVerifyResponse(
      makeVerifyResponse({
        status: "cancelled" as FlutterwaveTransactionData["status"],
      }),
    );
    expect(cancelled!.status).toBe(NormalizedPaymentStatus.Failed);
    expect(cancelled!.rawStatus).toBe("cancelled");
  });

  it("falls back to `amount` when charged_amount is absent, and handles a zero fee", () => {
    const response = makeVerifyResponse({ app_fee: 0 });
    // Simulate provider omitting charged_amount
    delete (response.data as Partial<FlutterwaveTransactionData>)
      .charged_amount;

    const result = normalizeFlutterwaveVerifyResponse(response);
    expect(result!.amountKobo).toBe(500_000);
    expect(result!.collectionFeeKobo).toBe(0);
  });

  it("rounds the VAT on non-integer fee arithmetic to whole Kobo", () => {
    // app_fee ₦33.33 → 3,333 Kobo; VAT 249.975 → rounds to 250
    const result = normalizeFlutterwaveVerifyResponse(
      makeVerifyResponse({ app_fee: 33.33 }),
    );
    expect(result!.collectionFeeKobo).toBe(3_333 + 250);
    expect(Number.isInteger(result!.collectionFeeKobo)).toBe(true);
  });

  it("returns null when the envelope status is not success", () => {
    const result = normalizeFlutterwaveVerifyResponse(
      makeVerifyResponse({}, "error"),
    );
    expect(result).toBeNull();
  });

  it("keeps the full raw response for audit", () => {
    const response = makeVerifyResponse();
    const result = normalizeFlutterwaveVerifyResponse(response);
    expect(result!.raw).toBe(response);
  });
});
