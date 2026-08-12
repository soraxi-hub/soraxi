import { PaymentGateway } from "@/enums";
import { PaymentGatewayFactory } from "./payment.factory";

/**
 * Platform-controlled gateway routing.
 *
 * Checkout never asks the customer which processor to use — it asks this
 * policy. The policy returns an ordered list of candidates: the configured
 * primary first, then any enabled fallbacks. PaymentService tries them in
 * order, failing over to the next candidate when payment initiation against
 * one provider errors — which is what actually removes the single-gateway
 * point of failure (a picker would still send customers to a dead gateway).
 *
 * A gateway is a candidate only when it is BOTH implemented in
 * PaymentGatewayFactory AND configured (its secret key present). Paystack
 * therefore activates by deploying its credentials — no code change.
 *
 * This is also a business lever: when per-gateway fees diverge, reordering
 * the candidates steers volume without touching the UI.
 */
export class GatewayRouter {
  /** The preferred gateway for new checkouts. */
  private static readonly PRIMARY = PaymentGateway.Flutterwave;

  /** Failover order after the primary. */
  private static readonly FALLBACKS: PaymentGateway[] = [
    PaymentGateway.Paystack,
  ];

  /** Whether the provider's credentials are deployed. */
  private static isConfigured(gateway: PaymentGateway): boolean {
    switch (gateway) {
      case PaymentGateway.Flutterwave:
        return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
      case PaymentGateway.Paystack:
        return Boolean(process.env.PAYSTACK_SECRET_KEY);
      default:
        return false;
    }
  }

  /**
   * Ordered candidates for a new checkout: primary first, then enabled
   * fallbacks. Never empty — throws if no gateway is usable, since checkout
   * cannot proceed at all in that state.
   */
  static candidateGateways(): PaymentGateway[] {
    const candidates = [this.PRIMARY, ...this.FALLBACKS].filter(
      (gateway) =>
        PaymentGatewayFactory.isSupported(gateway) &&
        this.isConfigured(gateway),
    );

    if (candidates.length === 0) {
      throw new Error(
        "No payment gateway is configured — checkout cannot proceed.",
      );
    }

    return candidates;
  }
}
