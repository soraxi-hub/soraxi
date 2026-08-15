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

  /**
   * Whether the provider's credentials are deployed.
   *
   * Paystack is pinned to `false` rather than reading its env var: the
   * integration is not finished, and deploying a key to test it must not be
   * what decides whether live customers can reach it. Restore the commented
   * line when Paystack goes live.
   */
  private static isConfigured(gateway: PaymentGateway): boolean {
    switch (gateway) {
      case PaymentGateway.Flutterwave:
        return Boolean(process.env.FLUTTERWAVE_SECRET_KEY);
      case PaymentGateway.Paystack:
        return false;
      // return Boolean(process.env.PAYSTACK_SECRET_KEY);
      default:
        return false;
    }
  }

  /**
   * Whether new checkouts may be sent to this gateway.
   *
   * Distinct from PaymentGatewayFactory.isSupported (which only asks whether
   * an adapter can be constructed): a provider can verify webhooks correctly
   * while still being deliberately kept out of live checkout.
   *
   * Paystack is OFF here as well as in isConfigured — two independent gates,
   * neither driven by environment variables, because being routed to means
   * real customer money. Flipping this alone changes nothing; going live
   * needs both. Note that turning these on makes Paystack a silent FAILOVER
   * target, not a customer-visible choice: checkout has no gateway picker,
   * so a Flutterwave outage would send customers to Paystack automatically.
   *
   * Neither gate affects /api/webhooks/paystack, which resolves its adapter
   * through PaymentGatewayFactory directly — so Paystack payments can be
   * confirmed during testing without opening live checkout to them.
   */
  private static isRoutable(gateway: PaymentGateway): boolean {
    switch (gateway) {
      case PaymentGateway.Flutterwave:
        return true;
      case PaymentGateway.Paystack:
        return false;
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
        this.isRoutable(gateway) &&
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
