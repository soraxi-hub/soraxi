import { PaymentGateway } from "@/enums";
import { IPaymentGateway } from "./gateways/gateway-interface";
import { FlutterwaveGateway } from "./gateways/flutterwave.gateway";
import { PaystackGateway } from "./gateways/paystack.gateway";

export class PaymentGatewayFactory {
  static getGateway(gateway: PaymentGateway): IPaymentGateway {
    switch (gateway) {
      case PaymentGateway.Flutterwave:
        return new FlutterwaveGateway();

      case PaymentGateway.Paystack:
        return new PaystackGateway();

      default:
        throw new Error("Unsupported payment gateway");
    }
  }

  /**
   * Whether an adapter exists for this gateway — i.e. whether getGateway can
   * construct one. This is NOT the same question as "may new checkouts be
   * routed here": that gate lives in GatewayRouter, because a provider can
   * have a working adapter (able to verify webhooks) before the rest of the
   * checkout flow supports it.
   */
  static isSupported(gateway: PaymentGateway): boolean {
    switch (gateway) {
      case PaymentGateway.Flutterwave:
      case PaymentGateway.Paystack:
        return true;
      default:
        return false;
    }
  }
}
