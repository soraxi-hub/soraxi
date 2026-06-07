import { PaymentGateway } from "@/enums";
import { PaymentGatewayFactory } from "../../domain/payment/payment.factory";
import { PreparedPaymentData } from "../checkout.service";
import { PublicToJSONUserType } from "@/domain/users/user-interface";

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
  }) {
    const { input, user } = props;
    // Get correct gateway implementation
    const paymentGateway = PaymentGatewayFactory.getGateway(gateway);

    // Delegate payment initialization
    return paymentGateway.initializePayment(input, user);
  }

  static async verifyPayment({
    gateway,
    transactionReference,
  }: {
    gateway: PaymentGateway;
    transactionReference: string;
  }) {
    // Get correct gateway implementation
    const paymentGateway = PaymentGatewayFactory.getGateway(gateway);

    // Delegate payment initialization
    return paymentGateway.verifyPayment(transactionReference);
  }

  static async handleWebhook() {}

  static async processSuccessfulPayment() {}

  static async refundPayment() {}

  static calculateGatewayFee() {}
}
