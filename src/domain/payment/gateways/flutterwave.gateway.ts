import { koboToNaira } from "@/lib/utils/naira";
import { OrderPendingService } from "@/services/orders/order-pending.service";
import { CartRepository } from "@/repositories/cart-repo";
import { IPaymentGateway } from "./gateway-interface";
import { PreparedPaymentData } from "@/services/checkout.service";
import { PublicToJSONUserType } from "@/domain/users/user-interface";
import { CartFactory } from "@/domain/cart/cart-factory";

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

export class FlutterwaveGateway implements IPaymentGateway {
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

  async initializePayment(
    input: PreparedPaymentData,
    user: PublicToJSONUserType,
  ) {
    /**
     * Step 1: Validate Cart
     */
    const cartDoc = await CartRepository.getCartByUserId(user.userId);
    if (!cartDoc) throw new Error("User cart not found.");
    const cart = CartFactory.createCart({
      ...cartDoc,
      _id: cartDoc._id?.toString(),
      userId: cartDoc.userId.toString(),
    });

    const { amount, customer } = input;
    const idempotencyKey = cart.idempotencyKey;

    // Ensure idempotency key exists
    if (!idempotencyKey)
      throw new Error("Idempotency key is missing from the cart.");

    // Create pending order
    const order = await OrderPendingService.createPendingOrder({
      user,
      cart,
      input,
    });

    /**
     * Critical: Please note that changing any of this data or field names may break
     * the webhook verification and payment confirmation process. Proceed with caution.
     * If you must change anything here, ensure you also update the webhook handler accordingly.
     */
    const payload = {
      tx_ref: idempotencyKey,
      amount: koboToNaira(amount), // Convert the amount from kobo to naira. For flutterwave, they need the amount in naira. Paystack is different.
      currency: "NGN",
      redirect_url:
        process.env.NEXT_PUBLIC_REDIRECT_URL ||
        "https://www.soraxihub.com/checkout/payment-status",
      customer: {
        email: customer.email,
        name: customer.name,
        phonenumber: customer.phone_number,
      },
      meta: {
        email: customer.email,
        phone_number: customer.phone_number,
        fullName: customer.name,
        idempotencyKey,
        orderId: order._id.toString(),
      },
      configurations: {
        session_duration: 30,
        max_retry_attempt: 3,
      },
    };

    return await this.getPaymentLink(payload);
  }

  /**
   * Verify a Flutterwave transaction by its ID or reference.
   * Includes retry logic and exponential backoff for reliability.
   * @param transactionReference - The transaction ID or reference from Flutterwave.
   */
  async verifyPayment(
    transactionReference: string,
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
            `Attempt ${attempt}: Failed to verify transaction - ${response.statusText}`,
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
