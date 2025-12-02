import { TRPCError } from "@trpc/server";

import { koboToNaira } from "@/lib/utils/naira";
import { getCartByUserId } from "@/lib/db/models/cart.model";
import { OrderService } from "@/services/order.service";
import { TokenData } from "@/lib/helpers/get-user-from-cookie";
import { FlutterwaveInput } from "@/validators/order-input-validators";
import { FlutterwavePayment } from "./payment";
import mongoose from "mongoose";

export type FlutterwavePayload = {
  tx_ref: string | undefined;
  amount: number;
  currency: string;
  redirect_url: string;
  customer: {
    email: string;
    name: string;
    phonenumber: string;
  };
  meta: {
    email: string;
    phone_number: string;
    fullName: string;
    idempotencyKey: string | undefined;
    orderId: string;
  };
  configurations: {
    session_duration: number;
    max_retry_attempt: number;
  };
};

export class FlutterwavePaymentService {
  private flutterwave = new FlutterwavePayment();
  private orderService = new OrderService();

  async initializePayment(input: FlutterwaveInput, user: TokenData | null) {
    /**
     * Step 1: Validate User
     */
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    /**
     * Step 2: Validate Cart
     */
    const cart = await getCartByUserId(user.id);
    if (!cart) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User cart not found.",
      });
    }

    if (input.meta.userId !== user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "userId mismatch",
      });
    }

    const { amount, customer } = input;
    const idempotencyKey = cart.idempotencyKey;

    // Ensure idempotency key exists
    if (!idempotencyKey) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Idempotency key is missing from the cart.",
      });
    }

    // Create pending order
    const order = await this.orderService.createPendingOrder({
      user,
      cart,
      input,
    });

    /**
     * Critical: Please note that changing any of this data or field names may break
     * the webhook verification and payment confirmation process. Proceed with caution.
     * If you must change anything here, ensure you also update the webhook handler accordingly.
     */
    const payload = {
      tx_ref: idempotencyKey,
      amount: koboToNaira(amount), // convert the amount from kobo to naira. for flutterwave, they need the amount in naira. Paystack is different.
      currency: "NGN",
      redirect_url:
        process.env.NEXT_PUBLIC_REDIRECT_URL ||
        "https://www.soraxihub.com/checkout/payment-status",
      customer: {
        email: customer.email,
        name: customer.name,
        phonenumber: customer.phone_number,
      },
      meta: {
        email: customer.email,
        phone_number: customer.phone_number,
        fullName: customer.name,
        idempotencyKey,
        orderId: (order._id as unknown as mongoose.Types.ObjectId).toString(),
      },
      configurations: {
        session_duration: 30,
        max_retry_attempt: 3,
      },
    };

    return await this.flutterwave.initializePayment(payload);
  }
}
