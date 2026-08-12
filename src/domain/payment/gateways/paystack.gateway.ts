import crypto from "node:crypto";
import { PaymentGateway } from "@/enums";
import {
  IPaymentGateway,
  GatewayInitiationPayload,
  InitializePaymentResult,
  NormalizedPaymentStatus,
  PaymentVerificationResult,
  VerifyPaymentParams,
} from "./gateway-interface";

/**
 * Paystack adapter.
 *
 * Built fixture-driven against Paystack's documented payloads — the live
 * integration is unverified until credentials are issued. Everything here is
 * exercised by tests/payment/paystack-adapter.test.ts.
 *
 * Two differences from Flutterwave worth holding in mind, both contained
 * entirely within this file by design:
 *  - Paystack transacts in **Kobo natively**, so no unit conversion happens
 *    on the way in or out. Flutterwave charges in Naira and converts.
 *  - Paystack's reported `fees` are already VAT-inclusive for Nigerian
 *    accounts, so no VAT is added on top (Flutterwave's `app_fee` excludes
 *    the 7.5% VAT and the adapter adds it).
 */

// ---------------------------------------------------------------------------
// Paystack API shapes
// ---------------------------------------------------------------------------

/**
 * Transaction statuses Paystack can report.
 * See https://paystack.com/docs/payments/verify-payments/
 */
export type PaystackTransactionStatus =
  | "success"
  | "failed"
  | "abandoned"
  | "reversed"
  | "pending"
  | "ongoing"
  | "processing"
  | "queued";

/**
 * The metadata we attach at initiation and read back on verification.
 *
 * Paystack echoes metadata back, but not always as an object: when the value
 * is round-tripped through certain dashboard/API paths it can come back as a
 * JSON **string**, or as an empty string when never set. `parsePaystackMetadata`
 * normalises all three cases.
 */
export interface PaystackMetadata {
  orderId: string;
  idempotencyKey: string;
  fullName: string;
  phone_number: string;
  email: string;
  [key: string]: unknown;
}

export interface PaystackTransactionData {
  id: number;
  domain: string;
  status: PaystackTransactionStatus;
  /** Our internal reference — the cart idempotency key. */
  reference: string;
  /** Amount charged, in Kobo. Paystack is Kobo-native. */
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string | null;
  created_at: string;
  /** Payment channel: "card" | "bank" | "ussd" | "bank_transfer" | "qr" | … */
  channel: string;
  currency: string;
  ip_address?: string;
  /** Paystack's fee for this transaction, in Kobo. VAT-inclusive in Nigeria. */
  fees: number | null;
  metadata: PaystackMetadata | string | null;
  customer: {
    id: number;
    email: string;
    customer_code: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  };
  authorization?: {
    authorization_code?: string;
    bin?: string;
    last4?: string;
    channel?: string;
    card_type?: string;
    bank?: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: PaystackTransactionData;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export type PaystackInitializePayload = {
  email: string;
  /** Kobo — Paystack's native unit; no conversion applied. */
  amount: number;
  reference: string;
  currency: string;
  callback_url: string;
  metadata: PaystackMetadata;
};

/**
 * Paystack webhook event names we care about. Transfer events exist too, but
 * payouts remain on Flutterwave — collections-only scope for multi-gateway.
 */
export enum PaystackWebhookEvent {
  CHARGE_SUCCESS = "charge.success",
}

export interface PaystackWebhookPayload {
  event: string;
  data: PaystackTransactionData;
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

/**
 * Paystack's metadata round-trip is not type-stable: it may arrive as the
 * object we sent, as a JSON string of that object, or as an empty string /
 * null when absent. Normalise to a partial object without ever throwing —
 * a malformed metadata blob must not take down verification, it must surface
 * as missing fields the caller can reject on.
 */
export function parsePaystackMetadata(
  metadata: PaystackMetadata | string | null | undefined,
): Partial<PaystackMetadata> {
  if (!metadata) return {};
  if (typeof metadata === "object") return metadata;

  try {
    const parsed: unknown = JSON.parse(metadata);
    return parsed && typeof parsed === "object"
      ? (parsed as Partial<PaystackMetadata>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Map a raw Paystack verify response into the gateway-neutral result.
 *
 * Pure function — exported separately from the class so the mapping (status
 * normalisation, metadata coercion, fee handling) is unit-testable without
 * network or environment setup.
 *
 * Returns null when the envelope status is false (transaction not found /
 * API-level error), matching the Flutterwave adapter's contract.
 */
export function normalizePaystackVerifyResponse(
  response: PaystackVerifyResponse,
): PaymentVerificationResult | null {
  if (!response.status || !response.data) return null;

  const data = response.data;
  const rawStatus = data.status.toLowerCase();

  let status: NormalizedPaymentStatus;
  if (rawStatus === "success") {
    status = NormalizedPaymentStatus.Successful;
  } else if (["pending", "ongoing", "processing", "queued"].includes(rawStatus)) {
    status = NormalizedPaymentStatus.Pending;
  } else {
    // "failed", "abandoned", "reversed", and anything unrecognised.
    // Consumers use rawStatus to distinguish abandoned from failed.
    status = NormalizedPaymentStatus.Failed;
  }

  const metadata = parsePaystackMetadata(data.metadata);

  return {
    provider: PaymentGateway.Paystack,
    status,
    rawStatus,
    // Kobo-native: no conversion. This is the single most important
    // difference from the Flutterwave adapter.
    amountKobo: data.amount,
    currency: data.currency,
    // Paystack fees are already VAT-inclusive for Nigerian accounts.
    collectionFeeKobo: data.fees ?? 0,
    gatewayTransactionId: String(data.id),
    reference: data.reference,
    paymentMethod: data.channel,
    meta: {
      orderId: metadata.orderId ?? "",
      // Paystack echoes our reference verbatim; it IS the idempotency key,
      // so fall back to it when metadata was lost in the round-trip.
      idempotencyKey: metadata.idempotencyKey ?? data.reference,
      email: metadata.email ?? data.customer?.email ?? "",
      phoneNumber: metadata.phone_number ?? data.customer?.phone ?? "",
      fullName:
        metadata.fullName ??
        [data.customer?.first_name, data.customer?.last_name]
          .filter(Boolean)
          .join(" "),
    },
    raw: response,
  };
}

// ---------------------------------------------------------------------------
// Webhook signature
// ---------------------------------------------------------------------------

/**
 * Verify a Paystack webhook signature.
 *
 * Paystack signs the **raw** request body with HMAC-SHA512 keyed on the
 * secret key, and sends the hex digest in `x-paystack-signature`. The body
 * must be hashed exactly as received — re-serialising parsed JSON changes
 * key order and whitespace and will never match.
 *
 * Comparison is timing-safe; a length mismatch short-circuits (timingSafeEqual
 * throws on unequal lengths).
 */
export function verifyPaystackSignature({
  rawBody,
  signature,
  secretKey,
}: {
  rawBody: string;
  signature: string | null;
  secretKey: string;
}): boolean {
  if (!signature || !secretKey) return false;

  const expected = crypto
    .createHmac("sha512", secretKey)
    .update(rawBody, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class PaystackGateway implements IPaymentGateway {
  readonly provider = PaymentGateway.Paystack;

  private readonly apiUrl: string;
  private readonly secretKey: string;
  private readonly maxRetries = 3;
  private readonly baseDelay = 500; // ms

  constructor() {
    this.apiUrl = process.env.PAYSTACK_API_URL || "https://api.paystack.co";
    this.secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";

    if (!this.secretKey || this.secretKey === "")
      throw new Error("Server configuration error: missing Paystack secret key");
  }

  /**
   * Turn the neutral initiation payload into Paystack's transaction-initialize
   * request and return the hosted checkout link. No business logic here —
   * cart validation and pending-order creation happen in PaymentService.
   */
  async initializePayment(
    input: GatewayInitiationPayload,
  ): Promise<InitializePaymentResult> {
    const { reference, amountKobo, orderId, redirectUrl, customer } = input;

    /**
     * Critical: the metadata field names below are read back by the webhook
     * handler and the verification path. Changing them here without updating
     * normalizePaystackVerifyResponse will break payment confirmation.
     */
    const payload: PaystackInitializePayload = {
      email: customer.email,
      amount: amountKobo, // Paystack is Kobo-native — no conversion.
      reference,
      currency: "NGN",
      callback_url: redirectUrl,
      metadata: {
        orderId,
        idempotencyKey: reference,
        fullName: customer.name,
        phone_number: customer.phoneNumber,
        email: customer.email,
      },
    };

    const response = await fetch(`${this.apiUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as PaystackInitializeResponse;

    if (!response.ok || !result.status || !result.data?.authorization_url) {
      throw new Error(result.message || "Paystack initialization failed");
    }

    // Map Paystack's envelope onto the neutral result the checkout UI reads.
    return {
      status: "success",
      message: result.message,
      data: { link: result.data.authorization_url },
    };
  }

  /**
   * Verify a Paystack transaction. Paystack's canonical lookup is by
   * reference (our idempotency key, which it echoes on redirect and webhook);
   * when only its own numeric id is known the transaction-fetch endpoint is
   * used instead. Includes retry logic and exponential backoff.
   */
  async verifyPayment(
    params: VerifyPaymentParams,
  ): Promise<PaymentVerificationResult | null> {
    const { reference, providerTransactionId } = params;

    let url: string;
    if (reference) {
      url = `${this.apiUrl}/transaction/verify/${encodeURIComponent(reference)}`;
    } else if (providerTransactionId) {
      url = `${this.apiUrl}/transaction/${encodeURIComponent(providerTransactionId)}`;
    } else {
      console.error(
        "PaystackGateway.verifyPayment: no transaction identifier provided",
      );
      return null;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error(
            `Attempt ${attempt}: Failed to verify Paystack transaction - ${response.statusText}`,
          );

          if (attempt === this.maxRetries) return null;
        } else {
          const data: PaystackVerifyResponse = await response.json();
          return normalizePaystackVerifyResponse(data);
        }
      } catch (error) {
        console.error(`Attempt ${attempt}: Network error -`, error);
        if (attempt === this.maxRetries) return null;
      }

      const delay = this.baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return null;
  }
}
