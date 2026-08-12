import { connectToDatabase } from "@/lib/db/mongoose";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { PaymentService } from "@/services/payment/payment.service";
import {
  PaystackWebhookEvent,
  verifyPaystackSignature,
  type PaystackWebhookPayload,
} from "@/domain/payment/gateways/paystack.gateway";
import { OrderFactory } from "@/domain/orders/order-factory";
import { CartService } from "@/services/cart/cart.service";
import { PaymentGateway } from "@/enums";
import { NormalizedPaymentStatus } from "@/domain/payment/gateways/gateway-interface";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * Paystack webhook front door.
 *
 * Mirrors the Flutterwave webhook route: verify the signature, re-verify the
 * transaction against the provider's API (never trust the webhook body's
 * amount or status), then hand the gateway-neutral result to the SAME
 * ProcessOrder path Flutterwave uses. One financial write path, N webhook
 * front doors — the provider and charged-amount guards inside
 * updateOrderRecordToSuccessState apply here automatically.
 */
export async function POST(request: Request) {
  // Paystack signs the RAW body — read it as text and hash exactly what was
  // received. Re-serialising parsed JSON would change key order and never match.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  await connectToDatabase();

  let session: mongoose.ClientSession | null = null;

  try {
    if (!secretKey) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Server configuration error: Missing required PAYSTACK_SECRET_KEY environment variable",
      );
    }

    if (!verifyPaystackSignature({ rawBody, signature, secretKey })) {
      throw new AppError("UNAUTHORIZED", "This request isn't from Paystack");
    }

    const requestBody = JSON.parse(rawBody) as PaystackWebhookPayload;
    const eventType = requestBody?.event;

    // Collections only — payouts stay on Flutterwave, so transfer.* events
    // are acknowledged and ignored rather than retried by Paystack.
    if (eventType !== PaystackWebhookEvent.CHARGE_SUCCESS) {
      return NextResponse.json(
        { message: `Event "${eventType}" ignored` },
        { status: 200 },
      );
    }

    const reference = requestBody?.data?.reference;
    if (!reference) {
      throw new AppError(
        "BAD_REQUEST",
        "Transaction reference missing in Paystack webhook payload",
      );
    }

    const processOrder = await OrderFactory.getProcessOrderInstance();
    session = await mongoose.startSession();
    session.startTransaction();

    // Re-verify server-side; the adapter returns the gateway-neutral result
    // (Paystack is Kobo-native, so no conversion happens on the way in).
    const verifiedTransaction = await PaymentService.verifyPayment({
      gateway: PaymentGateway.Paystack,
      refs: { reference },
    });

    if (
      !verifiedTransaction ||
      verifiedTransaction.status !== NormalizedPaymentStatus.Successful
    ) {
      throw new AppError("BAD_REQUEST", "Transaction not successful", {
        transactionStatus: verifiedTransaction?.rawStatus,
      });
    }

    const { collectionFeeKobo, gatewayTransactionId, paymentMethod, meta } =
      verifiedTransaction;
    const { orderId, idempotencyKey } = meta;

    if (!orderId) {
      throw new AppError(
        "BAD_REQUEST",
        "Missing order reference in Paystack transaction metadata",
        { reference },
      );
    }

    const customerInfo = {
      fullName: meta.fullName,
      email: meta.email,
    };

    const result = await processOrder.updateOrderRecordToSuccessState({
      orderId,
      idempotencyKey,
      transactionId: Number(gatewayTransactionId),
      session,
      paymentMethod,
      customerInfo,
      collectionFeeKobo,
      provider: verifiedTransaction.provider,
      amountPaidKobo: verifiedTransaction.amountKobo,
      currency: verifiedTransaction.currency,
    });

    if (!result.ok) {
      throw new AppError(
        "BAD_REQUEST",
        result.error ??
          "There is an issue updating order records via the Paystack webhook route.",
        { orderId, idempotencyKey },
      );
    }

    if (result.userId) {
      CartService.clearCart(result.userId);
    }

    await session.commitTransaction();

    return NextResponse.json(
      { message: "Webhook processed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Paystack webhook processing failed:", error);
    if (session) {
      await session.abortTransaction();
    }
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, {
            source: "webhook:paystack",
          }),
        );
      } catch {
        // sendTelegramMessage already console.errors; never mask the original error
      }
    }
    return handleApiError(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
