import { connectToDatabase } from "@/lib/db/mongoose";
import { NextResponse } from "next/server";
import { PaymentConfirmationService } from "@/services/payment/payment-confirmation.service";
import {
  PaystackWebhookEvent,
  verifyPaystackSignature,
  type PaystackWebhookPayload,
} from "@/domain/payment/gateways/paystack.gateway";
import { PaymentGateway } from "@/enums";
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
 * Mirrors the Flutterwave route: authenticate the request, identify the
 * transaction, then delegate everything financial to
 * PaymentConfirmationService — the single shared write path, which re-verifies
 * server-side rather than trusting any amount or status in the webhook body.
 */
export async function POST(request: Request) {
  // Paystack signs the RAW body — read it as text and hash exactly what was
  // received. Re-serialising parsed JSON would change key order and never match.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  await connectToDatabase();

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

    // Paystack echoes our reference verbatim, so unlike Flutterwave no
    // pre-verification round trip is needed to find the order.
    const reference = requestBody?.data?.reference;
    if (!reference) {
      // Malformed payload — redelivery cannot add a reference that was never
      // sent, so tell Paystack to stop rather than retry forever.
      throw new AppError(
        "BAD_REQUEST",
        "Transaction reference missing in Paystack webhook payload",
      );
    }

    const result = await PaymentConfirmationService.confirmFromGateway({
      reference,
      gateway: PaymentGateway.Paystack,
    });

    if (!result.ok) {
      // Retryable faults (Paystack's API unreachable mid-verification) earn a
      // 5xx so the webhook is redelivered; deliberate rejections get a 4xx so
      // Paystack stops, since those already alert an admin for a decision.
      throw new AppError(
        result.retryable ? "BAD_GATEWAY" : "BAD_REQUEST",
        result.error,
        { reference },
      );
    }

    return NextResponse.json(
      { message: "Webhook processed successfully", status: result.status },
      { status: 200 },
    );
  } catch (error) {
    console.error("Paystack webhook processing failed:", error);
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, { source: "webhook:paystack" }),
        );
      } catch {
        // sendTelegramMessage already console.errors; never mask the original error
      }
    }
    return handleApiError(error);
  }
}
