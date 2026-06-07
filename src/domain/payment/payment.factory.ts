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
}
