import { PaymentGateway } from "@/enums";
import { PaymentGatewayFactory } from "../../domain/payment/payment.factory";
import { PreparedPaymentData } from "../checkout.service";
import { PublicToJSONUserType } from "@/domain/users/user-interface";
import { CartRepository } from "@/repositories/cart-repo";
import { CartFactory } from "@/domain/cart/cart-factory";
import { OrderPendingService } from "@/services/orders/order-pending.service";
import type {
  InitializePaymentResult,
  PaymentVerificationResult,
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
  static async initializePayment({
    gateway,
    props,
  }: {
    gateway: PaymentGateway;
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

    // ── Step 2: Create the pending order, recording WHICH gateway will
    // collect the payment. The order record is the single source of truth
    // for the provider from this point on — the status page and webhook
    // handlers derive the gateway from the record, never from the URL.
    const order = await OrderPendingService.createPendingOrder({
      user,
      cart,
      input,
      gateway,
    });

    // ── Step 3: Hand the neutral payload to the selected adapter ─────────
    const paymentGateway = PaymentGatewayFactory.getGateway(gateway);

    return paymentGateway.initializePayment({
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
    });
  }

  static async verifyPayment({
    gateway,
    transactionReference,
  }: {
    gateway: PaymentGateway;
    transactionReference: string;
  }): Promise<PaymentVerificationResult | null> {
    const paymentGateway = PaymentGatewayFactory.getGateway(gateway);

    return paymentGateway.verifyPayment(transactionReference);
  }
}
