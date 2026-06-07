import { FlutterwaveVerifyResponse } from "./flutterwave.gateway";
import { PublicToJSONUserType } from "@/domain/users/user-interface";
import { PreparedPaymentData } from "@/services/checkout.service";

export interface IPaymentGateway {
  initializePayment(
    input: PreparedPaymentData,
    user: PublicToJSONUserType,
  ): Promise<{
    status: string;
    message: string;
    data: {
      link: string;
    };
  }>;

  verifyPayment(
    transactionReference: string,
  ): Promise<FlutterwaveVerifyResponse | null>;
}
