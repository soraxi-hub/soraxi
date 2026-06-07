import { type NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/utils/cron-auth.util";
import { PayoutProcessingService } from "@/services/payment/payout/payout-processing.service";

/**
 * GET /api/cron/process-payouts
 *
 * Picks up all PayoutRecord documents with status INITIATED and calls
 * Flutterwave's Transfer API for each one.
 *
 * After this job runs:
 * - Successful transfers → payout moves to PROCESSING
 *   Stage 6 webhook handles the final COMPLETED or FAILED outcome
 * - Failed transfers → payout reversed, vendor wallet restored
 *
 * Schedule: Daily at 8:00am (see vercel.json)
 * Security: Vercel CRON_SECRET header verification
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    console.log("[Cron] process-payouts: Starting job run");

    const summary = await PayoutProcessingService.processInitiatedPayouts();

    console.log(
      `[Cron] process-payouts: Completed — ${summary.succeeded} succeeded, ${summary.failed} failed out of ${summary.totalInitiated} initiated`,
    );

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error: any) {
    console.error("[Cron] process-payouts: Job failed with error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Unexpected error during payout processing job",
      },
      { status: 500 },
    );
  }
}
