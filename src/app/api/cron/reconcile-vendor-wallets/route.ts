import { type NextRequest, NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/utils/cron-auth.util";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getVendorWalletModel } from "@/lib/db/models/vendor-wallet.model";
import {
  reconcileVendorWallet,
  reconcileVendorDebt,
} from "@/lib/utils/reconciliation.util";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatCronSummary,
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * GET /api/cron/reconcile-vendor-wallets
 *
 * Reconciles every vendor's wallet balances and outstanding debt against
 * the ledger — the vendor-scoped counterpart to reconcile-financials.
 *
 * Unlike the global checks, this job's cost scales with vendor count: one
 * reconcileVendorWallet + one reconcileVendorDebt call per vendor. Each
 * individual call is already index-bound (see reconciliation.util.ts), but
 * running 1000+ of them sequentially would blow past a serverless function's
 * execution window, and running them all with Promise.all at once would
 * exhaust the DB connection pool. This job processes vendors in bounded
 * concurrent batches to stay within both limits.
 *
 * At Soraxi's current vendor count this finishes well within a single
 * invocation. As vendor count grows, watch the duration in Vercel's cron
 * logs — once this job risks the platform's function timeout, the fix is
 * either (a) a batched aggregation version of reconcileVendorWallet that
 * takes an array of vendorIds and groups with $in in one query per chunk,
 * replacing the per-vendor loop below, or (b) a checkpoint-based cursor so
 * each invocation only picks up where the last one left off. Neither is
 * needed yet — see the reconciliation scale discussion for the full plan.
 *
 * A single vendor's reconciliation failing (e.g. a missing wallet document)
 * does not fail the whole job — it's recorded and the job continues, same
 * pattern as the other cron jobs in this codebase.
 *
 * Schedule: Daily at 3:30am (see vercel.json) — after reconcile-financials.
 * Security: Vercel CRON_SECRET header verification
 */

// How many vendors to reconcile concurrently per batch. Keep this well
// below your DB connection pool size — each vendor in a batch runs 2
// concurrent queries (wallet + debt reconciliation).
const BATCH_SIZE = 25;

// Cap how many individual discrepancies get echoed back in the response
// body, same rationale as reconcile-financials.
const MAX_SAMPLE_SIZE = 20;

interface VendorReconciliationFailure {
  vendorId: string;
  reason: string;
}

interface VendorWalletDiscrepancy {
  vendorId: string;
  discrepancies: Record<string, number>;
}

interface VendorDebtDiscrepancy {
  vendorId: string;
  stored: number;
  derived: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function GET(request: NextRequest) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    console.log("[Cron] reconcile-vendor-wallets: Starting job run");

    await connectToDatabase();
    const VendorWallet = await getVendorWalletModel();

    const vendorIds: string[] = (
      await VendorWallet.find({}, { vendorId: 1 }).lean<
        { vendorId: { toString(): string } }[]
      >()
    ).map((wallet: { vendorId: { toString(): string } }) =>
      wallet.vendorId.toString(),
    );

    const walletDiscrepancies: VendorWalletDiscrepancy[] = [];
    const debtDiscrepancies: VendorDebtDiscrepancy[] = [];
    const failures: VendorReconciliationFailure[] = [];

    let walletChecked = 0;
    let debtChecked = 0;

    for (const batch of chunk(vendorIds, BATCH_SIZE)) {
      const results = await Promise.allSettled(
        batch.map(async (vendorId) => {
          const [walletResult, debtResult] = await Promise.all([
            reconcileVendorWallet(vendorId),
            reconcileVendorDebt(vendorId),
          ]);
          return { vendorId, walletResult, debtResult };
        }),
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const vendorId = batch[i];

        if (result.status === "rejected") {
          failures.push({
            vendorId,
            reason:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
          continue;
        }

        walletChecked += 1;
        debtChecked += 1;

        const { walletResult, debtResult } = result.value;

        if (!walletResult.isBalanced) {
          walletDiscrepancies.push({
            vendorId,
            discrepancies: walletResult.discrepancies as Record<string, number>,
          });
        }

        if (!debtResult.isBalanced) {
          debtDiscrepancies.push({
            vendorId,
            stored: debtResult.stored,
            derived: debtResult.derived,
          });
        }
      }
    }

    const hasDiscrepancies =
      walletDiscrepancies.length > 0 ||
      debtDiscrepancies.length > 0 ||
      failures.length > 0;

    const summary = {
      totalVendors: vendorIds.length,
      walletChecked,
      debtChecked,
      failed: failures.length,
      hasDiscrepancies,
      walletDiscrepancies: {
        count: walletDiscrepancies.length,
        sample: walletDiscrepancies.slice(0, MAX_SAMPLE_SIZE),
      },
      debtDiscrepancies: {
        count: debtDiscrepancies.length,
        sample: debtDiscrepancies.slice(0, MAX_SAMPLE_SIZE),
      },
      failures: failures.slice(0, MAX_SAMPLE_SIZE),
    };

    if (hasDiscrepancies) {
      console.error(
        "[Cron] reconcile-vendor-wallets: DISCREPANCIES FOUND —",
        JSON.stringify(summary),
      );
    } else {
      console.log(
        `[Cron] reconcile-vendor-wallets: Completed — ${vendorIds.length} vendors checked, all balanced`,
      );
    }

    try {
      await sendTelegramMessage(
        formatCronSummary(
          "cron:reconcile-vendor-wallets",
          [
            `Total vendors: ${summary.totalVendors}`,
            `Wallet checked: ${summary.walletChecked}`,
            `Debt checked: ${summary.debtChecked}`,
            `Failed: ${summary.failed}`,
            `Wallet discrepancies: ${summary.walletDiscrepancies.count}`,
            `Debt discrepancies: ${summary.debtDiscrepancies.count}`,
          ],
          hasDiscrepancies ? "attention" : "ok",
        ),
      );
    } catch {
      // sendTelegramMessage already console.errors; don't fail the job over it
    }

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error: any) {
    console.error(
      "[Cron] reconcile-vendor-wallets: Job failed with error:",
      error,
    );

    if (isReportableError(error)) {
      try {
        await sendTelegramMessage(
          formatErrorReport(error, {
            source: "cron:reconcile-vendor-wallets",
          }),
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
          "Unexpected error during vendor wallet reconciliation job",
      },
      { status: 500 },
    );
  }
}
