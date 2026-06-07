import { type NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/utils/cron-auth.util";
import { DisputeAutoResolutionService } from "@/services/disputes/dispute-auto-resolution.service";

/**
 * GET /api/cron/auto-resolve-disputes
 *
 * Finds all disputes that have passed their 5 business day resolution
 * deadline without being resolved by the platform team and auto-resolves
 * them in the student's favour.
 *
 * Runs the Stage 4C financial flow for each qualifying dispute.
 *
 * Schedule: Daily at 2:00am (see vercel.json)
 * Security: Vercel CRON_SECRET header verification
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    console.log("[Cron] auto-resolve-disputes: Starting job run");

    const summary = await DisputeAutoResolutionService.processOverdueDisputes();

    console.log(
      `[Cron] auto-resolve-disputes: Completed — ${summary.resolved} resolved, ${summary.failed} failed out of ${summary.totalOverdue} overdue`,
    );

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error: any) {
    console.error(
      "[Cron] auto-resolve-disputes: Job failed with error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error.message ??
          "Unexpected error during dispute auto-resolution job",
      },
      { status: 500 },
    );
  }
}
