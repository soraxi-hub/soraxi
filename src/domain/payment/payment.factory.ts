import { PaymentGateway } from "@/enums";
import { IPaymentGateway } from "./gateways/gateway-interface";
import { FlutterwaveGateway } from "./gateways/flutterwave.gateway";

export class PaymentGatewayFactory {
  static getGateway(gateway: PaymentGateway): IPaymentGateway {
    switch (gateway) {
      case PaymentGateway.Flutterwave:
        return new FlutterwaveGateway();

      default:
        throw new Error("Unsupported payment gateway");
    }
  }

  /**
   * Whether an adapter exists for this gateway. GatewayRouter uses this so
   * routing candidates can never include a provider that would throw above.
   */
  static isSupported(gateway: PaymentGateway): boolean {
    switch (gateway) {
      case PaymentGateway.Flutterwave:
        return true;
      default:
        return false;
    }
  }
}
