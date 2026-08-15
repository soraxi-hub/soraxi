import { PaymentGateway } from "@/enums";
import { PaymentGatewayFactory } from "../../domain/payment/payment.factory";
import { GatewayRouter } from "../../domain/payment/gateway-routing";
import { PreparedPaymentData } from "../checkout.service";
import { PublicToJSONUserType } from "@/domain/users/user-interface";
import { CartRepository } from "@/repositories/cart-repo";
import { CartFactory } from "@/domain/cart/cart-factory";
import { OrderPendingService } from "@/services/orders/order-pending.service";
import { getOrderModel } from "@/lib/db/models/order.model";
import type {
  GatewayInitiationPayload,
  InitializePaymentResult,
  PaymentVerificationResult,
  VerifyPaymentParams,
} from "@/domain/payment/gateways/gateway-interface";

/**
 * Orchestrates payment initiation and verification across gateways.
 *
 * The business steps that must happen for EVERY provider — cart validation,
 * pending-order creation (which records the chosen gateway on the order),
 * building the neutral initiation payload — live here, once. The gateway
 * adapters only translate that payload to their provider's API and normalise
 * the responses back.
 */
export class PaymentService {
  /**
   * Start a checkout payment using platform-controlled gateway routing.
   *
   * GatewayRouter supplies the ordered candidates. The pending order is
   * created once, recording the first candidate; if initiation against that
   * provider fails (API error, outage), the order's paymentGateway is
   * updated to the next candidate and initiation is retried — the customer
   * simply receives the fallback provider's payment link. The order record
   * therefore always names the gateway that actually issued the link.
   */
  static async initializePayment({
    props,
  }: {
    props: {
      input: PreparedPaymentData;
      user: PublicToJSONUserType;
    };
  }): Promise<InitializePaymentResult> {
    const { input, user } = props;

    // ── Step 1: Validate cart ────────────────────────────────────────────
    const cartDoc = await CartRepository.getCartByUserId(user.userId);
    if (!cartDoc) throw new Error("User cart not found.");
    const cart = CartFactory.createCart({
      ...cartDoc,
      _id: cartDoc._id?.toString(),
      userId: cartDoc.userId.toString(),
    });

    const idempotencyKey = cart.idempotencyKey;
    if (!idempotencyKey)
      throw new Error("Idempotency key is missing from the cart.");

    const candidates = GatewayRouter.candidateGateways();

    // ── Step 2: Create the pending order, recording WHICH gateway will
    // collect the payment. The order record is the single source of truth
    // for the provider from this point on — the status page and webhook
    // handlers derive the gateway from the record, never from the URL.
    const order = await OrderPendingService.createPendingOrder({
      user,
      cart,
      input,
      gateway: candidates[0]!,
    });

    const payload: GatewayInitiationPayload = {
      reference: idempotencyKey,
      amountKobo: input.amount,
      orderId: order._id.toString(),
      redirectUrl:
        process.env.NEXT_PUBLIC_REDIRECT_URL ||
        "https://www.soraxihub.com/checkout/payment-status",
      customer: {
        email: input.customer.email,
        name: input.customer.name,
        phoneNumber: input.customer.phone_number,
      },
    };

    // ── Step 3: Try each candidate in order ──────────────────────────────
    let lastError: unknown;
    for (let i = 0; i < candidates.length; i++) {
      const gateway = candidates[i]!;
      try {
        if (i > 0) {
          // Failover: re-point the order at the gateway actually being used
          // BEFORE requesting the link, so a webhook arriving mid-flight
          // never finds a stale provider on the record.
          await PaymentService.recordGatewayOnOrder(
            order._id.toString(),
            gateway,
          );
        }

        const adapter = PaymentGatewayFactory.getGateway(gateway);
        return await adapter.initializePayment(payload);
      } catch (error) {
        lastError = error;
        console.error(
          `[PaymentService] Payment initiation failed on ${gateway}` +
            (i < candidates.length - 1 ? " — failing over" : ""),
          error,
        );
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Payment initiation failed on every configured gateway.");
  }

  /** Update the provider recorded on a pending order (failover only). */
  private static async recordGatewayOnOrder(
    orderId: string,
    gateway: PaymentGateway,
  ): Promise<void> {
    const Order = await getOrderModel();
    await Order.updateOne({ _id: orderId }, { $set: { paymentGateway: gateway } });
  }

  static async verifyPayment({
    gateway,
    refs,
  }: {
    gateway: PaymentGateway;
    refs: VerifyPaymentParams;
  }): Promise<PaymentVerificationResult | null> {
    const paymentGateway = PaymentGatewayFactory.getGateway(gateway);

    return paymentGateway.verifyPayment(refs);
  }
}
