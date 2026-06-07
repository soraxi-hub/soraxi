import { type NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/utils/cron-auth.util";
import { DisputeEvidenceExpiryService } from "@/services/disputes/dispute-evidence-expiry.service";

/**
 * GET /api/cron/expire-dispute-evidence
 *
 * Finds all disputes in AWAITING_EVIDENCE status whose 48-hour evidence
 * submission window has expired without a student response, and rejects
 * them — releasing frozen funds back to the vendor.
 *
 * Runs the Stage 4B (Rejected) financial flow for each qualifying dispute.
 *
 * Schedule: Every 4 hours (see vercel.json)
 * Security: Vercel CRON_SECRET header verification
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    console.log("[Cron] expire-dispute-evidence: Starting job run");

    const summary =
      await DisputeEvidenceExpiryService.processExpiredEvidenceDeadlines();

    console.log(
      `[Cron] expire-dispute-evidence: Completed — ${summary.resolved} resolved, ${summary.failed} failed out of ${summary.totalExpired} expired`,
    );

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error: any) {
    console.error(
      "[Cron] expire-dispute-evidence: Job failed with error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Unexpected error during evidence expiry job",
      },
      { status: 500 },
    );
  }
}
