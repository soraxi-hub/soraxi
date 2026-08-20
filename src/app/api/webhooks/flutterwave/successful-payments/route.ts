import { connectToDatabase } from "@/lib/db/mongoose";
import { NextResponse } from "next/server";
import { PaymentConfirmationService } from "@/services/payment/payment-confirmation.service";
import { FlutterwaveWebhookEvent } from "@/domain/payment/gateways/flutterwave.gateway";
import { PayoutWebhookHandler } from "@/services/payment/payout/payout-webhook-handler.service";
import { PaymentGateway } from "@/enums";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * Flutterwave webhook front door.
 *
 * Responsibilities stop at authenticating the request and identifying the
 * transaction. Everything financial is delegated to
 * PaymentConfirmationService, which the Paystack webhook, the status-page
 * fallback and the cron backstop all share â€” so a gateway result is turned
 * into ledger truth by exactly one piece of code.
 */
export async function POST(request: Request) {
  const requestBody = await request.json();
  const headers = request.headers;
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH_KEY;

  await connectToDatabase();

  try {
    if (!secretHash) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Server configuration error: Missing required FLUTTERWAVE environment variables",
      );
    }

    const signature = headers.get("verif-hash");

    if (!signature || signature !== secretHash) {
      throw new AppError("UNAUTHORIZED", "This request isn't from Flutterwave");
    }

    // ----------------------------------------------------------------
    // Event type detection â€” route before any further processing.
    //
    // Flutterwave sends an "event" field on every webhook payload.
    // We check it here and route accordingly before doing anything else.
    // ----------------------------------------------------------------
    const eventType = requestBody?.event as string | undefined;

    if (eventType === FlutterwaveWebhookEvent.TRANSFER_COMPLETED) {
      // --- Transfer event (Stage 6) ---
      // Route to PayoutWebhookHandler â€” completely separate from payment flow
      const result = await PayoutWebhookHandler.handle(requestBody.data);

      return NextResponse.json(
        { message: result.message },
        { status: result.status ?? (result.ok ? 200 : 500) },
      );
    }

    // Read our own reference straight off the payload.
    //
    // It is untrusted, but it is only used to locate the order â€” the
    // authoritative status and amount still come from the server-side
    // verification inside confirmFromGateway, so a forged tx_ref cannot mark
    // anything paid. It can only cause us to verify a reference, which is
    // exactly what the cron sweep does anyway.
    //
    // This also removes a redundant round trip: the route used to verify once
    // purely to learn the reference, and confirmFromGateway then verified the
    // very same transaction again.
    const reference: string | undefined = requestBody?.data?.tx_ref;
    if (!reference) {
      // Malformed payload â€” no amount of redelivery adds a missing tx_ref.
      throw new AppError(
        "BAD_REQUEST",
        "Transaction reference (tx_ref) missing in Flutterwave webhook payload",
      );
    }

    // Single financial write path â€” idempotent, so a webhook racing the
    // status-page fallback settles the order exactly once.
    const result = await PaymentConfirmationService.confirmFromGateway({
      reference,
      gateway: PaymentGateway.Flutterwave,
    });

    if (!result.ok) {
      // Retryable faults earn a 5xx so Flutterwave redelivers; deliberate
      // rejections (underpayment, gateway mismatch) get a 4xx so it stops,
      // since those are already alerting an admin for a human decision.
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
    console.error("Webhook processing failed:", error);
    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, {
            source: "webhook:flutterwave/successful-payments",
          }),
        );
      } catch {
        // sendTelegramMessage already console.errors; never mask the original error
      }
    }
    return handleApiError(error);
  }
}

