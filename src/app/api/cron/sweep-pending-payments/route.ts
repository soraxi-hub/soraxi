import { type NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/utils/cron-auth.util";
import { PaymentConfirmationService } from "@/services/payment/payment-confirmation.service";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatCronSummary,
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * GET /api/cron/sweep-pending-payments
 *
 * Backstop for the checkout confirmation flow. Finds orders still Pending
 * well after checkout and re-verifies each against the gateway that issued
 * its payment link, settling those the gateway has a verdict for.
 *
 * This is what guarantees no order is ever permanently stuck: it covers
 * webhooks that never arrived, customers who closed the tab before the
 * status page's fallback fired, and gateway outages during the confirmation
 * window. Nothing about an order's fate depends on a browser staying open.
 *
 * Schedule: every 15 minutes (see vercel.json)
 * Security: Vercel CRON_SECRET header verification
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    console.log("[Cron] sweep-pending-payments: Starting job run");

    const summary = await PaymentConfirmationService.sweepStalePendingOrders({
      olderThanMinutes: 15,
      limit: 100,
    });

    // Only report when there was something to do — a quiet checkout window is
    // the normal case and shouldn't page anyone every 15 minutes.
    if (summary.totalEligible > 0) {
      try {
        await sendTelegramMessage(
          formatCronSummary("cron:sweep-pending-payments", [
            `Eligible: ${summary.totalEligible}`,
            `Paid: ${summary.paid}`,
            `Failed/Cancelled: ${summary.failed}`,
            `Still pending: ${summary.stillPending}`,
            `Errored: ${summary.errored}`,
          ]),
        );
      } catch {
        // sendTelegramMessage already console.errors; don't fail the job over it
      }
    }

    console.log(
      `[Cron] sweep-pending-payments: Completed — ${summary.paid} paid, ${summary.failed} failed, ` +
        `${summary.stillPending} still pending, ${summary.errored} errored out of ${summary.totalEligible} eligible`,
    );

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error: any) {
    console.error(
      "[Cron] sweep-pending-payments: Job failed with error:",
      error,
    );

    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, { source: "cron:sweep-pending-payments" }),
        );
      } catch {
        // sendTelegramMessage already console.errors; never mask the original error
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Unexpected error during pending-payment sweep",
      },
      { status: 500 },
    );
  }
}
