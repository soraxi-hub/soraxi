import { type NextRequest, NextResponse } from "next/server";

import { verifyCronRequest } from "@/lib/utils/cron-auth.util";
import { OutboxDrainService } from "@/services/messaging/outbox-drain.service";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatCronSummary,
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * GET /api/cron/drain-message-outbox
 *
 * Dispatches pending messaging side effects — new-message emails today,
 * whatever else gets registered tomorrow — to their handlers.
 *
 * This is the asynchronous half of message sending. `sendMessage` writes the
 * message and an outbox event in one transaction and returns immediately; this
 * job does the slow work off the request path, so send latency is never bound
 * by an SMTP handshake and a mail failure can never lose a message.
 *
 * Schedule: every minute (see vercel.json)
 * Security: Vercel CRON_SECRET header verification
 *
 * Runs far more often than the other jobs because it sits in a user-visible
 * path: an hour-old "you have a new message" email is worse than none.
 */
export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    const summary = await OutboxDrainService.run();

    // Only report when there was something to say. A per-minute job that
    // announces "0 events" all day trains everyone to ignore the channel.
    if (summary.failed > 0 || summary.remaining > 0) {
      try {
        await sendTelegramMessage(
          formatCronSummary("cron:drain-message-outbox", [
            `Claimed: ${summary.claimed}`,
            `Succeeded: ${summary.succeeded}`,
            `Failed: ${summary.failed}`,
            `Remaining: ${summary.remaining}`,
          ]),
        );
      } catch {
        // sendTelegramMessage already console.errors; don't fail the job over it
      }
    }

    if (summary.claimed > 0) {
      console.log(
        `[Cron] drain-message-outbox: ${summary.succeeded} succeeded, ${summary.failed} failed, ${summary.remaining} remaining`,
      );
    }

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error: any) {
    console.error("[Cron] drain-message-outbox: Job failed with error:", error);

    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, { source: "cron:drain-message-outbox" }),
        );
      } catch {
        // sendTelegramMessage already console.errors; never mask the original error
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Unexpected error draining message outbox",
      },
      { status: 500 },
    );
  }
}
