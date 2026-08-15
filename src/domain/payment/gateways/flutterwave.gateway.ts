import { koboToNaira, nairaToKobo } from "@/lib/utils/naira";
import { PaymentGateway } from "@/enums";
import {
  IPaymentGateway,
  GatewayInitiationPayload,
  InitializePaymentResult,
  NormalizedPaymentStatus,
  PaymentVerificationResult,
  VerifyPaymentParams,
} from "./gateway-interface";

export interface FlutterwaveVerifyResponse {
  status: "success" | "error";
  message: string;
  data: FlutterwaveTransactionData;
}

export interface FlutterwaveTransactionData {
  id: number;
  tx_ref: string;
  flw_ref: string;
  device_fingerprint?: string;
  amount: number;
  currency: string;
  charged_amount: number;
  app_fee: number;
  amount_settled: number;
  merchant_fee: number;
  processor_response: string;
  auth_model?: string;
  ip?: string;
  narration?: string;
  status: "successful" | "failed" | "pending" | "success";
  payment_type: "card" | "bank_transfer" | "ussd" | "account" | string;
  created_at: string;
  account_id?: number;
  // Payment method details
  card?: {
    first_6digits: string;
    last_4digits: string;
    issuer: string;
    country: string;
    type: string;
    token?: string;
    expiry: string;
  };
  bank_transfer?: {
    account_number: string;
    bank_name: string;
    bank_code?: string;
  };
  ussd?: {
    code: string;
    bank: string;
  };
  // Meta data - most important for your app
  meta: {
    __CheckoutInitAddress?: string;
    email: string;
    phone_number: string;
    fullName: string;
    orderId: string; // Your DB link
    idempotencyKey: string; // Crucial for preventing duplicates
    [key: string]: any; // in case Flutterwave adds new fields
  };
  customer?: {
    id: number;
    name: string;
    phone_number: string;
    email: string;
    created_at: string;
  };
}

// ---------------------------------------------------------------------------
// ADD these interfaces to payment.ts alongside the existing ones
// ---------------------------------------------------------------------------

/**
 * Flutterwave transfer webhook event types.
 * These are the event strings Flutterwave sends in the webhook payload
 * when a transfer (payout) is completed or fails.
 */
export enum FlutterwaveWebhookEvent {
  // Payment collection events (already handled)
  CHARGE_COMPLETED = "charge.completed",

  // Transfer (payout) events (Stage 6)
  TRANSFER_COMPLETED = "transfer.completed",
}

/**
 * Status values returned by Flutterwave on a transfer webhook.
 * Note: Flutterwave uses uppercase for transfer statuses
 * unlike the lowercase used in payment statuses.
 */
export enum FlutterwaveTransferWebhookStatus {
  SUCCESSFUL = "SUCCESSFUL",
  FAILED = "FAILED",
  NEW = "NEW",
}

/**
 * Shape of the data object inside a Flutterwave transfer webhook payload.
 *
 * Flutterwave sends this when a transfer (payout) is completed or fails.
 * The `reference` field is the transfer ID we stored on the PayoutRecord
 * as `flutterwaveTransferId` when the background job initiated the transfer.
 */
export interface IFlutterwaveTransferWebhookData {
  id: number; // Flutterwave's internal transfer ID
  account_number: string; // Recipient account number
  bank_code: string; // Recipient bank code
  full_name: string; // Recipient account name
  amount: number; // Amount transferred (in Naira)
  currency: string; // Always "NGN"
  status: FlutterwaveTransferWebhookStatus;
  reference: string; // Our flutterwaveTransferId — the DB link
  narration: string;
  complete_message: string; // Human-readable status message from Flutterwave
  requires_approval: number;
  is_approved: number;
  bank_name: string;
  fee: number;
  created_at: string;
}

/**
 * Full shape of a Flutterwave transfer webhook payload.
 */
export interface IFlutterwaveTransferWebhookPayload {
  event: FlutterwaveWebhookEvent.TRANSFER_COMPLETED;
  data: IFlutterwaveTransferWebhookData;
}

export type FlutterwavePayload = {
  tx_ref: string | undefined;
  amount: number;
  currency: string;
  redirect_url: string;
  customer: {
    email: string;
    name: string;
    phonenumber: string;
  };
  meta: {
    email: string;
    phone_number: string;
    fullName: string;
    idempotencyKey: string | undefined;
    orderId: string;
  };
  configurations: {
    session_duration: number;
    max_retry_attempt: number;
  };
};

/**
 * Map a raw Flutterwave verify response into the gateway-neutral result.
 *
 * Pure function — exported separately from the class so the mapping (status
 * normalization, Naira→Kobo conversion, fee + VAT arithmetic) is unit-testable
 * without network or environment setup.
 *
 * Returns null when the envelope status is not "success" (transaction not
 * found / API-level error) — matching the historical behavior where callers
 * treated that as "could not retrieve transaction data".
 */
export function normalizeFlutterwaveVerifyResponse(
  response: FlutterwaveVerifyResponse,
): PaymentVerificationResult | null {
  if (response.status !== "success" || !response.data) return null;

  const data = response.data;
  const rawStatus = data.status.toLowerCase();

  const successStatuses = ["successful", "success", "completed"];
  let status: NormalizedPaymentStatus;
  if (successStatuses.includes(rawStatus)) {
    status = NormalizedPaymentStatus.Successful;
  } else if (rawStatus === "pending") {
    status = NormalizedPaymentStatus.Pending;
  } else {
    // "failed", "cancelled", and anything unrecognised — consumers use
    // rawStatus to distinguish failed from cancelled.
    status = NormalizedPaymentStatus.Failed;
  }

  // Flutterwave reports amounts and fees in Naira; the platform works in
  // Kobo. app_fee excludes VAT, which Flutterwave charges at 7.5% on the fee.
  const appFeeKobo = nairaToKobo(data.app_fee ?? 0);
  const vatKobo = Math.round(appFeeKobo * 0.075);

  return {
    provider: PaymentGateway.Flutterwave,
    status,
    rawStatus,
    amountKobo: nairaToKobo(data.charged_amount ?? data.amount),
    currency: data.currency,
    collectionFeeKobo: appFeeKobo + vatKobo,
    gatewayTransactionId: String(data.id),
    reference: data.tx_ref,
    paymentMethod: data.payment_type,
    meta: {
      orderId: data.meta.orderId,
      idempotencyKey: data.meta.idempotencyKey,
      email: data.meta.email,
      phoneNumber: data.meta.phone_number,
      fullName: data.meta.fullName,
    },
    raw: response,
  };
}

export class FlutterwaveGateway implements IPaymentGateway {
  readonly provider = PaymentGateway.Flutterwave;

  private readonly apiUrl: string;
  private readonly secretKey: string;
  private readonly maxRetries = 3;
  private readonly baseDelay = 500; // ms

  constructor() {
    this.apiUrl =
      process.env.FLUTTERWAVE_API_URL || "https://api.flutterwave.com/v3";
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY ?? "";

    if (!this.secretKey || this.secretKey === "")
      throw new Error(
        "Server configuration error: missing Flutterwave secret key",
      );
  }

  /**
   * Turn the neutral initiation payload into Flutterwave's hosted-checkout
   * request and return the payment link. No business logic here — cart
   * validation and pending-order creation happen in PaymentService before
   * this is called.
   */
  async initializePayment(
    input: GatewayInitiationPayload,
  ): Promise<InitializePaymentResult> {
    const { reference, amountKobo, orderId, redirectUrl, customer } = input;

    /**
     * Critical: Please note that changing any of this data or field names may break
     * the webhook verification and payment confirmation process. Proceed with caution.
     * If you must change anything here, ensure you also update the webhook handler accordingly.
     */
    const payload: FlutterwavePayload = {
      tx_ref: reference,
      amount: koboToNaira(amountKobo), // Flutterwave charges in Naira. Paystack is different.
      currency: "NGN",
      redirect_url: redirectUrl,
      customer: {
        email: customer.email,
        name: customer.name,
        phonenumber: customer.phoneNumber,
      },
      meta: {
        email: customer.email,
        phone_number: customer.phoneNumber,
        fullName: customer.name,
        idempotencyKey: reference,
        orderId,
      },
      configurations: {
        session_duration: 30,
        max_retry_attempt: 3,
      },
    };

    return await this.getPaymentLink(payload);
  }

  /**
   * Verify a Flutterwave transaction. Prefers the numeric transaction id
   * (the identifier Flutterwave hands back on redirect and webhook
   * payloads); falls back to verify-by-reference with our tx_ref when only
   * the internal reference is known (e.g. a cron backstop sweeping stuck
   * orders). Includes retry logic and exponential backoff for reliability.
   */
  async verifyPayment(
    params: VerifyPaymentParams,
  ): Promise<PaymentVerificationResult | null> {
    const { reference, providerTransactionId } = params;

    let url: string;
    if (providerTransactionId) {
      url = `${this.apiUrl}/transactions/${Number(providerTransactionId)}/verify`;
    } else if (reference) {
      url = `${this.apiUrl}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;
    } else {
      console.error(
        "FlutterwaveGateway.verifyPayment: no transaction identifier provided",
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
            `Attempt ${attempt}: Failed to verify transaction - ${response.statusText}`,
          );

          // If we've reached the max retries, give up
          if (attempt === this.maxRetries) return null;
        } else {
          const data: FlutterwaveVerifyResponse = await response.json();
          return normalizeFlutterwaveVerifyResponse(data);
        }
      } catch (error) {
        console.error(`Attempt ${attempt}: Network error -`, error);
        if (attempt === this.maxRetries) return null;
      }

      // Exponential backoff delay before retrying
      const delay = this.baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    return null;
  }

  private async getPaymentLink(payload: FlutterwavePayload) {
    const response = await fetch(`${this.apiUrl}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as {
      status: string;
      message: string;
      data: {
        link: string;
      };
    };

    if (!response.ok || !result.status)
      throw new Error(result.message || "Flutterwave initialization failed");

    return result;
  }
}
