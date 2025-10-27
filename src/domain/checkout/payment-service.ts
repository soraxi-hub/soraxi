import type { PaymentData } from "@/types";
import { toast } from "sonner";

/** Handles payment processing and gateway integration */
export class PaymentService {
  async processPayment(paymentData: PaymentData, mutation: any): Promise<void> {
    return new Promise((resolve, reject) => {
      mutation.mutate(paymentData, {
        onSuccess: (response: any) => {
          if (response.status && response.data?.link) {
            toast.success("Redirecting to payment...");
            window.location.href = response.data.link;
            resolve();
          } else {
            const error = response.message || "Failed to initialize payment";
            toast.error(error);
            reject(new Error(error));
          }
        },
        onError: (error: any) => {
          const message =
            error.message || "Something went wrong while initializing payment.";
          toast.error(message);
          reject(error);
        },
      });
    });
  }
}
