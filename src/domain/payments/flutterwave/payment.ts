import { TRPCError } from "@trpc/server";
import { FlutterwavePayload } from "./flutterwave.service";

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
    orderId: string; // 👈 Your DB link
    idempotencyKey: string; // 👈 Crucial for preventing duplicates
    [key: string]: any; // in case Flutterwave adds new fields
  };

  amount_settled?: number;

  customer?: {
    id: number;
    name: string;
    phone_number: string;
    email: string;
    created_at: string;
  };
}

export class FlutterwavePayment {
  private readonly apiUrl: string;
  private readonly secretKey: string;
  private readonly maxRetries = 3;
  private readonly baseDelay = 500; // ms

  constructor() {
    this.apiUrl =
      process.env.FLUTTERWAVE_API_URL || "https://api.flutterwave.com/v3";
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY ?? "";

    if (!this.secretKey) {
      console.error("Missing required Flutterwave secret key");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Server configuration error: missing Flutterwave secret key",
      });
    }
  }

  /**
   * Verify a Flutterwave transaction by its ID or reference.
   * Includes retry logic and exponential backoff for reliability.
   * @param transactionReference - The transaction ID or reference from Flutterwave.
   */
  async verifyTransaction(
    transactionReference: string
  ): Promise<FlutterwaveVerifyResponse | null> {
    const url = `${this.apiUrl}/transactions/${Number(transactionReference)}/verify`;

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
            `Attempt ${attempt}: Failed to verify transaction - ${response.statusText}`
          );

          // If we've reached the max retries, give up
          if (attempt === this.maxRetries) return null;
        } else {
          const data: FlutterwaveVerifyResponse = await response.json();
          return data;
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

  async initializePayment(payload: FlutterwavePayload) {
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

    if (!response.ok || !result.status) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: result.message || "Flutterwave initialization failed",
      });
    }

    return result;
  }
}
