import { type NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/utils/cron-auth.util";
import { OrderAutoConfirmService } from "@/services/orders/order-auto-confirm.service";

/**
 * GET /api/cron/auto-confirm-orders
 *
 * Finds all suborders that have been out for delivery for more than
 * 3 days without student confirmation and auto-confirms them.
 *
 * Runs the Stage 2 financial flow for each qualifying suborder.
 *
 * Schedule: Daily at 4:00am (see vercel.json)
 * Security: Vercel CRON_SECRET header verification
 */
export async function GET(request: NextRequest) {
  // Verify this request came from Vercel's cron scheduler
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    console.log("[Cron] auto-confirm-orders: Starting job run");

    const summary = await OrderAutoConfirmService.processEligibleSuborders();

    console.log(
      `[Cron] auto-confirm-orders: Completed — ${summary.confirmed} confirmed, ${summary.failed} failed out of ${summary.totalEligible} eligible`,
    );

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error: any) {
    console.error("[Cron] auto-confirm-orders: Job failed with error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Unexpected error during auto-confirm job",
      },
      { status: 500 },
    );
  }
}
