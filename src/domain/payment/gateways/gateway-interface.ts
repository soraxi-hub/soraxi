import { PaymentGateway } from "@/enums";

/**
 * Gateway-neutral payment contract.
 *
 * Every payment provider (Flutterwave today, Paystack next) implements
 * IPaymentGateway and maps its provider-specific request/response shapes into
 * the neutral types below. Nothing outside `src/domain/payment/gateways/`
 * should ever handle a provider's raw payload — consumers (webhook routes,
 * verification procedures, ProcessOrder) work exclusively with the
 * normalized types, so adding a gateway never touches the financial write
 * path.
 */

// ---------------------------------------------------------------------------
// Initiation
// ---------------------------------------------------------------------------

/**
 * Neutral input for starting a checkout payment. Built by PaymentService
 * AFTER cart validation and pending-order creation — a gateway's only job is
 * to turn this into its provider's payload and return a payment link.
 *
 * All amounts are in Kobo. Adapters convert to their provider's unit
 * internally (Flutterwave charges in Naira, Paystack in Kobo) — that
 * conversion living inside the adapter is the point: unit bugs stay caged in
 * one file per provider.
 */
export interface GatewayInitiationPayload {
  /**
   * Our internal transaction reference, passed to the gateway as its
   * `tx_ref`/`reference`. This is the cart's idempotency key — the same value
   * used to look the order up from the status page and to dedupe webhook
   * processing. It comes back verbatim on every redirect and webhook,
   * whatever the provider.
   */
  reference: string;
  /** Total charge in Kobo. */
  amountKobo: number;
  /** _id of the pending Order document (stringified). */
  orderId: string;
  /** Where the gateway should send the customer after payment. */
  redirectUrl: string;
  customer: {
    email: string;
    name: string;
    phoneNumber: string;
  };
}

/**
 * Result of a successful payment initiation. `data.link` is the hosted
 * checkout URL the customer is redirected to. Shape is kept identical to the
 * historical Flutterwave envelope because the checkout UI consumes it.
 */
export interface InitializePaymentResult {
  status: string;
  message: string;
  data: {
    link: string;
  };
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/** Provider-agnostic transaction outcome. */
export enum NormalizedPaymentStatus {
  Successful = "successful",
  Failed = "failed",
  Pending = "pending",
}

/**
 * Gateway-neutral verification result. Each adapter maps its provider's
 * verify-API response into this shape; all money figures are in Kobo.
 */
export interface PaymentVerificationResult {
  /** Which gateway verified this transaction. */
  provider: PaymentGateway;
  /** Normalized outcome — what consumers branch on. */
  status: NormalizedPaymentStatus;
  /**
   * The provider's own status string, lowercased (e.g. Flutterwave's
   * "cancelled"). Kept because failure handling distinguishes "failed" from
   * abandoned/cancelled, and the status page surfaces it to the customer.
   */
  rawStatus: string;
  /** Amount the customer was actually charged, in Kobo. */
  amountKobo: number;
  /** ISO currency code, e.g. "NGN". */
  currency: string;
  /**
   * The provider's collection fee including VAT, in Kobo. Feeds
   * writeCollectionFee so escrow reflects what the gateway actually kept.
   */
  collectionFeeKobo: number;
  /** The provider's transaction id, stringified (Flutterwave: numeric id). */
  gatewayTransactionId: string;
  /** Our internal reference (the idempotency key) echoed back by the provider. */
  reference: string;
  /** Provider's payment channel, e.g. "card", "bank_transfer", "ussd". */
  paymentMethod: string;
  /** The checkout metadata we attached at initiation, echoed back. */
  meta: {
    orderId: string;
    idempotencyKey: string;
    email: string;
    phoneNumber: string;
    fullName: string;
  };
  /** The provider's raw response, for debugging and audit only. */
  raw: unknown;
}

// ---------------------------------------------------------------------------
// The gateway contract
// ---------------------------------------------------------------------------

export interface IPaymentGateway {
  /** Which provider this adapter talks to. */
  readonly provider: PaymentGateway;

  /**
   * Create a hosted-checkout session for the prepared payment and return the
   * redirect link. Performs NO business logic — cart validation and
   * pending-order creation happen in PaymentService before this is called.
   */
  initializePayment(
    payload: GatewayInitiationPayload,
  ): Promise<InitializePaymentResult>;

  /**
   * Verify a transaction against the provider's API and return the
   * normalized result, or null when the provider cannot resolve the
   * transaction (not found / API exhausted retries).
   *
   * `providerTransactionRef` is the identifier the provider itself hands
   * back on redirect or webhook — adapter-specific by nature (Flutterwave:
   * the numeric transaction id; Paystack: the reference string). Callers
   * always obtained it from that provider's own redirect/webhook payload, so
   * no cross-provider ambiguity exists.
   */
  verifyPayment(
    providerTransactionRef: string,
  ): Promise<PaymentVerificationResult | null>;
}
