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

/**
 * Identifier used to verify a transaction.
 *
 * Deliberately just our own reference — the cart idempotency key — for every
 * provider. Both gateways expose a verify-by-reference endpoint, and both
 * answer an unknown reference with the same "no such transaction" shape they
 * use for an unknown transaction id, so nothing is lost by standardising.
 *
 * The reference is also the only identifier that always exists. A provider's
 * transaction id is absent precisely when we most need an answer: an
 * abandoned checkout never creates a transaction, so there is no id to look
 * up, and abandonment would be undetectable if verification depended on one.
 */
export interface VerifyPaymentParams {
  /** Our internal reference (the cart idempotency key / tx_ref). */
  reference: string;
}

/**
 * The result of asking a gateway about a transaction.
 *
 * The three cases must stay distinct, because two of them look identical from
 * the outside and mean opposite things:
 *
 *  - `not_found` is a *definitive negative*. The gateway is healthy and is
 *    telling us this transaction does not exist — the customer abandoned
 *    checkout without ever attempting payment. No gateway emits a webhook for
 *    that, so this is the only signal abandonment ever produces.
 *  - `unavailable` is *transient*. The gateway is down, timing out, or
 *    erroring, so we know nothing about the transaction and must ask again.
 *
 * Collapsing these into a single `null` (as this contract previously did)
 * makes abandonment indistinguishable from an outage, which in turn makes it
 * unsafe to ever expire an unpaid order: doing so would cancel live payments
 * every time a gateway had a wobble.
 */
export type VerificationOutcome =
  | { kind: "verified"; result: PaymentVerificationResult }
  | { kind: "not_found"; message?: string }
  | { kind: "unavailable"; message?: string };

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
   * Ask the provider about a transaction.
   *
   * Adapters must map their provider's "no such transaction" response to
   * `not_found` and everything else that went wrong to `unavailable` — see
   * VerificationOutcome for why the distinction carries real weight.
   */
  verifyPayment(params: VerifyPaymentParams): Promise<VerificationOutcome>;
}
