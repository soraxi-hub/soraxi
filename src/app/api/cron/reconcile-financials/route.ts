import { type NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/utils/cron-auth.util";
import {
  checkGlobalBalance,
  reconcilePlatformWallet,
  verifyJournalEntryIntegrity,
  checkLedgerStructuralIntegrity,
  checkEscrowSolvency,
  checkLedgerAccountingIdentity,
} from "@/lib/utils/reconciliation.util";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatCronSummary,
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * GET /api/cron/reconcile-financials
 *
 * Runs the system-wide (non-vendor-scoped) financial integrity checks:
 * - checkGlobalBalance — system-wide credit/debit balance, scoped to the
 *   previous 24 hours
 * - reconcilePlatformWallet — PlatformWallet cache vs PLATFORM_REVENUE_*
 *   ledger accounts
 * - verifyJournalEntryIntegrity — per-entry balance check, scoped to the
 *   previous 24 hours
 * - checkLedgerStructuralIntegrity — orphaned lines, malformed entity
 *   fields, duplicate journal entries, scoped to the previous 24 hours
 * - checkEscrowSolvency: platform-controlled assets vs outstanding
 *   third-party liabilities (a loose >= solvency signal)
 * - checkLedgerAccountingIdentity: exact system-wide integrity identity
 *   (assets minus third-party liabilities === retained earnings). A non-zero
 *   delta means a malformed entry somewhere.
 *
 * All six checks are cheap relative to vendor-level reconciliation, each
 * is a single indexed aggregation (or a handful of them) bounded by the
 * previous day's ledger activity, not total collection size. Vendor-level
 *
 * This job never throws on a discrepancy — discrepancies are a normal,
 * expected finding for a monitoring job, not a job failure. It only
 * returns a 500 if a check itself couldn't run (e.g. DB connectivity).
 *
 * Every run — balanced or not — also posts a summary to Telegram via
 * `notifyOpsOfDiscrepancies` / the completion path below.
 *
 * TODO: results are currently just logged and returned in the response.
 * Once discrepancies start showing up in practice, consider persisting
 * each run to a ReconciliationReport collection instead of relying on
 * Vercel's log retention.
 *
 * Schedule: Daily at 3:00am (see vercel.json) — ahead of
 * reconcile-vendor-wallets (3:30am) and the existing 4:00am/8:00am jobs.
 * Security: Vercel CRON_SECRET header verification
 */

// Cap how many individual problem records get echoed back in the response
// body — full detail should come from logs / a persisted report, not from
// a potentially large JSON payload on every cron invocation.
const MAX_SAMPLE_SIZE = 10;

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    console.log("[Cron] reconcile-financials: Starting job run");

    const dateTo = new Date();
    const dateFrom = new Date(dateTo.getTime() - 24 * 60 * 60 * 1000);

    const [
      globalBalance,
      platformWallet,
      unbalancedJournalEntries,
      structuralIntegrity,
      escrowSolvency,
      accountingIdentity,
    ] = await Promise.all([
      checkGlobalBalance(dateFrom, dateTo),
      reconcilePlatformWallet(),
      verifyJournalEntryIntegrity(dateFrom, dateTo),
      checkLedgerStructuralIntegrity(dateFrom, dateTo),
      checkEscrowSolvency(),
      checkLedgerAccountingIdentity(),
    ]);

    const hasDiscrepancies =
      !globalBalance.isBalanced ||
      !platformWallet.isBalanced ||
      unbalancedJournalEntries.length > 0 ||
      structuralIntegrity.orphanedLines.length > 0 ||
      structuralIntegrity.malformedEntityLines.length > 0 ||
      structuralIntegrity.duplicateJournalGroups.length > 0 ||
      !escrowSolvency.isSolvent ||
      !accountingIdentity.isBalanced;

    const summary = {
      windowStart: dateFrom.toISOString(),
      windowEnd: dateTo.toISOString(),
      hasDiscrepancies,
      globalBalance: {
        isBalanced: globalBalance.isBalanced,
        delta: globalBalance.delta,
      },
      platformWallet: {
        isBalanced: platformWallet.isBalanced,
        discrepancies: platformWallet.discrepancies,
      },
      unbalancedJournalEntries: {
        count: unbalancedJournalEntries.length,
        sample: unbalancedJournalEntries.slice(0, MAX_SAMPLE_SIZE),
      },
      structuralIntegrity: {
        orphanedLineCount: structuralIntegrity.orphanedLines.length,
        malformedEntityLineCount:
          structuralIntegrity.malformedEntityLines.length,
        duplicateJournalGroupCount:
          structuralIntegrity.duplicateJournalGroups.length,
        orphanedLinesSample: structuralIntegrity.orphanedLines.slice(
          0,
          MAX_SAMPLE_SIZE,
        ),
        malformedEntityLinesSample:
          structuralIntegrity.malformedEntityLines.slice(0, MAX_SAMPLE_SIZE),
        duplicateJournalGroupsSample:
          structuralIntegrity.duplicateJournalGroups.slice(0, MAX_SAMPLE_SIZE),
      },
      escrowSolvency: {
        isSolvent: escrowSolvency.isSolvent,
        delta: escrowSolvency.delta,
      },
      accountingIdentity: {
        isBalanced: accountingIdentity.isBalanced,
        delta: accountingIdentity.delta,
        assetsMinusLiabilities: accountingIdentity.assetsMinusLiabilities,
        retainedEarnings: accountingIdentity.retainedEarnings,
        // Full account breakdown only when the identity is off, to keep the
        // healthy-run payload small (mirrors the MAX_SAMPLE_SIZE philosophy).
        ...(accountingIdentity.isBalanced
          ? {}
          : { components: accountingIdentity.components }),
      },
    };

    if (hasDiscrepancies) {
      console.error(
        "[Cron] reconcile-financials: DISCREPANCIES FOUND —",
        JSON.stringify(summary),
      );
      await notifyOpsOfDiscrepancies(summary);
    } else {
      console.log(
        "[Cron] reconcile-financials: Completed — all checks balanced",
      );

      try {
        await sendTelegramMessage(
          formatCronSummary(
            "cron:reconcile-financials",
            [
              `Global balance: ${globalBalance.isBalanced ? "balanced" : "off"}`,
              `Platform wallet: ${platformWallet.isBalanced ? "balanced" : "off"}`,
              `Unbalanced journal entries: ${unbalancedJournalEntries.length}`,
              `Escrow: ${escrowSolvency.isSolvent ? "solvent" : "insolvent"}`,
              `Accounting identity: ${accountingIdentity.isBalanced ? "balanced" : "off"}`,
            ],
            "ok",
          ),
        );
      } catch {
        // sendTelegramMessage already console.errors; don't fail the job over it
      }
    }

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error: any) {
    console.error("[Cron] reconcile-financials: Job failed with error:", error);

    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, { source: "cron:reconcile-financials" }),
        );
      } catch {
        // sendTelegramMessage already console.errors; never mask the original error
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error.message ??
          "Unexpected error during financial reconciliation job",
      },
      { status: 500 },
    );
  }
}

/**
 * Alerts ops that a reconciliation run found a discrepancy.
 */
async function notifyOpsOfDiscrepancies(summary: unknown): Promise<void> {
  try {
    await sendTelegramMessage(
      formatCronSummary(
        "cron:reconcile-financials",
        [`Discrepancy details:`, JSON.stringify(summary, null, 2)],
        "attention",
      ),
    );
  } catch (err) {
    console.error(
      "[Cron] reconcile-financials: failed to send discrepancy alert:",
      err,
    );
  }
}
