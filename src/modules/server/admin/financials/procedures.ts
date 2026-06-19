import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { connectToDatabase } from "@/lib/db/mongoose";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { AdminGuard } from "@/domain/admin/admin-guard";
import {
  FlutterwavePaymentStatus,
  LedgerAccountType,
  LedgerEntryCategory,
  LedgerEntryType,
} from "@/enums/financial.enums";
import { getLedgerLineModel } from "@/lib/db/models/ledger-line.model";
import { getJournalEntryModel } from "@/lib/db/models/journal-entry.model";
import { getTransactionRecordModel } from "@/lib/db/models/transaction-record.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getProductModel } from "@/lib/db/models/product.model";
import { StoreStatusEnum, ProductStatusEnum } from "@/enums";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

/**
 * Predefined time-frame presets, plus a "custom" mode for arbitrary ranges.
 *
 * Resolving a preset to an actual { from, to } pair is done inside each
 * procedure so the server clock is always the reference — never the client.
 */
const TimeframePresetSchema = z.enum([
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "last_year",
  "all_time",
  "custom",
]);

const MetricsDateFilterSchema = z
  .object({
    preset: TimeframePresetSchema.default("last_30_days"),
    /**
     * Only required when preset === "custom".
     * Both values are ISO 8601 date strings; the procedure converts them to
     * UTC Date objects and clamps them to the start/end of day respectively.
     */
    customFrom: z.string().datetime().optional(),
    customTo: z.string().datetime().optional(),
  })
  .refine(
    (val) => {
      if (val.preset === "custom") {
        return !!val.customFrom && !!val.customTo;
      }
      return true;
    },
    {
      message: "customFrom and customTo are required when preset is 'custom'.",
      path: ["customFrom"],
    },
  );

// ---------------------------------------------------------------------------
// Helper: resolve preset → { from: Date, to: Date }
// ---------------------------------------------------------------------------

/**
 * Converts a timeframe preset (or custom range) into an inclusive date range.
 * All boundaries are UTC-aligned to midnight / end-of-day.
 *
 * Returns `null` for `from` when preset is "all_time" — callers must omit
 * the `createdAt` filter entirely in that case (no lower bound).
 */
function resolveDateRange(input: z.infer<typeof MetricsDateFilterSchema>): {
  from: Date | null;
  to: Date;
} {
  const now = new Date();

  // Helpers
  const startOfDay = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const endOfDay = (d: Date) =>
    new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  const addDays = (d: Date, n: number) =>
    new Date(d.getTime() + n * 24 * 60 * 60 * 1000);

  switch (input.preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };

    case "yesterday": {
      const yesterday = addDays(now, -1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }

    case "last_7_days":
      return { from: startOfDay(addDays(now, -6)), to: endOfDay(now) };

    case "last_30_days":
      return { from: startOfDay(addDays(now, -29)), to: endOfDay(now) };

    case "this_month":
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        to: endOfDay(now),
      };

    case "last_month": {
      const firstOfLastMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      );
      const lastOfLastMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999),
      );
      return { from: firstOfLastMonth, to: lastOfLastMonth };
    }

    case "this_quarter": {
      const quarterStart = Math.floor(now.getUTCMonth() / 3) * 3;
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), quarterStart, 1)),
        to: endOfDay(now),
      };
    }

    case "last_quarter": {
      const currentQuarterStart = Math.floor(now.getUTCMonth() / 3) * 3;
      const lastQuarterStartMonth = currentQuarterStart - 3;
      const year =
        lastQuarterStartMonth < 0
          ? now.getUTCFullYear() - 1
          : now.getUTCFullYear();
      const month =
        lastQuarterStartMonth < 0
          ? lastQuarterStartMonth + 12
          : lastQuarterStartMonth;
      return {
        from: new Date(Date.UTC(year, month, 1)),
        to: new Date(Date.UTC(year, month + 3, 0, 23, 59, 59, 999)),
      };
    }

    case "this_year":
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        to: endOfDay(now),
      };

    case "last_year":
      return {
        from: new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)),
        to: new Date(
          Date.UTC(now.getUTCFullYear() - 1, 11, 31, 23, 59, 59, 999),
        ),
      };

    case "all_time":
      return { from: null, to: endOfDay(now) };

    case "custom":
      return {
        from: startOfDay(new Date(input.customFrom!)),
        to: endOfDay(new Date(input.customTo!)),
      };
  }
}

/**
 * Builds a MongoDB `createdAt` range filter from a resolved date range.
 * Returns an empty object when `from` is null (all_time — no lower bound).
 */
function buildDateFilter(range: {
  from: Date | null;
  to: Date;
}): Record<string, unknown> {
  if (range.from === null) {
    return { createdAt: { $lte: range.to } };
  }
  return { createdAt: { $gte: range.from, $lte: range.to } };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const adminFinancialMetricsRouter = createTRPCRouter({
  /**
   * GET /admin/metrics/platform
   *
   * Returns all four key platform metrics for the requested time frame:
   *   1. Active Seller Count
   *   2. Total Platform GMV
   *   3. Total Transaction Count
   *   4. Refund Volume (count + value)
   *
   * Requires VIEW_FINANCIAL_ANALYTICS permission.
   *
   * Source of truth for each metric:
   *   - GMV & Refunds  → LedgerLine (immutable double-entry records)
   *   - Transactions   → TransactionRecord (one per order)
   *   - Active Sellers → Store + Product (live operational data)
   *
   * All monetary values are returned in Kobo. Divide by 100 on the client
   * to display in Naira.
   */
  getPlatformMetrics: baseProcedure
    .input(MetricsDateFilterSchema)
    .query(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;

      AdminGuard.from(unAuthenticatedAdmin).require(
        PERMISSIONS.VIEW_FINANCIAL_ANALYTICS,
      );

      try {
        await connectToDatabase();

        const range = resolveDateRange(input);
        const dateFilter = buildDateFilter(range);

        const [LedgerLine, JournalEntry, TransactionRecord, Store, Product] =
          await Promise.all([
            getLedgerLineModel(),
            getJournalEntryModel(),
            getTransactionRecordModel(),
            getStoreModel(),
            getProductModel(),
          ]);

        // ─────────────────────────────────────────────────────────────────
        // 1. ACTIVE SELLER COUNT
        //
        // Definition: stores that are Active AND have at least one visible,
        // active product within the time window.
        //
        // "Within the time window" is applied to the product's createdAt so
        // the metric reflects sellers who were active *during* the period,
        // not just their all-time existence.
        //
        // For "all_time", we drop the date filter on products and return the
        // full active seller count.
        // ─────────────────────────────────────────────────────────────────
        const activeStoreIds = await Store.distinct("_id", {
          status: StoreStatusEnum.Active,
        });

        const productFilter: Record<string, unknown> = {
          storeId: { $in: activeStoreIds },
          status: ProductStatusEnum.Approved,
          isVisible: true,
          ...dateFilter,
        };

        const activeSellerIds = await Product.distinct(
          "storeId",
          productFilter,
        );
        const activeSellerCount = activeSellerIds.length;

        // ─────────────────────────────────────────────────────────────────
        // 2. TOTAL PLATFORM GMV
        //
        // ─── GMV (corrected) ──────────────────────────────────────────────────────
        // Source: JournalEntry category PAYMENT_RECEIVED → LedgerLine DEBIT on
        // PLATFORM_ESCROW. One journal entry per order, so count = transaction count.
        //
        // We do NOT query LedgerLine by accountType + direction because PLATFORM_ESCROW
        // is also debited by PAYOUT_COMPLETED and credited by GATEWAY_FEE and
        // GATEWAY_FEE_REVERSAL — none of which are GMV events.
        // ──────────────────────────────────────────────────────────────────────────

        // Same result but slow since there is lookup. Use primarily for reconciliation
        // const gmvPipeline = [
        //   {
        //     $match: {
        //       category: LedgerEntryCategory.PAYMENT_RECEIVED,
        //       ...dateFilter,
        //     },
        //   },
        //   {
        //     $lookup: {
        //       from: "ledgerlines",
        //       let: { jId: "$_id" },
        //       pipeline: [
        //         {
        //           $match: {
        //             $expr: { $eq: ["$journalId", "$$jId"] },
        //             accountType: LedgerAccountType.PLATFORM_ESCROW,
        //             type: LedgerEntryType.DEBIT, // ← DEBIT, not CREDIT
        //           },
        //         },
        //       ],
        //       as: "escrowLines",
        //     },
        //   },
        //   {
        //     $group: {
        //       _id: null,
        //       totalGmvKobo: {
        //         $sum: { $arrayElemAt: ["$escrowLines.amount", 0] },
        //       },
        //     },
        //   },
        // ];
        // const gmvResult = await JournalEntry.aggregate(gmvPipeline);

        // Same result but faster since there is no lookup
        const gmvResult = await TransactionRecord.aggregate([
          {
            $match: {
              flutterwaveStatus: FlutterwavePaymentStatus.SUCCESSFUL,
              ...dateFilter,
            },
          },
          {
            $group: {
              _id: null,
              totalGmvKobo: { $sum: "$totalAmount" },
            },
          },
        ]);

        const totalGmvKobo: number = gmvResult[0]?.totalGmvKobo ?? 0;

        // ─────────────────────────────────────────────────────────────────
        // 3. TOTAL TRANSACTION COUNT
        //
        // A transaction is counted only when Flutterwave confirms SUCCESSFUL
        // payment. PENDING and FAILED records are excluded.
        // ─────────────────────────────────────────────────────────────────
        const transactionCount = await TransactionRecord.countDocuments({
          flutterwaveStatus: FlutterwavePaymentStatus.SUCCESSFUL,
          ...dateFilter,
        });

        // ─────────────────────────────────────────────────────────────────
        // 4. REFUND VOLUME (count + value)
        //
        // Step A — find all JournalEntry IDs with category REFUND_ISSUED
        //          within the time window. The date filter is applied to the
        //          JournalEntry, not the LedgerLine, because the journal entry
        //          is the event record; ledger lines inherit its timestamp.
        //
        // Step B — sum LedgerLine amounts for those journal IDs where the
        //          line is a CREDIT on CUSTOMER_REFUND_PAYABLE (the debit
        //          side hits VENDOR_AVAILABLE or PLATFORM_ESCROW, so we only
        //          need one side to avoid double-counting).
        // ─────────────────────────────────────────────────────────────────
        const refundJournalEntries = await JournalEntry.find({
          category: LedgerEntryCategory.REFUND_ISSUED,
          ...dateFilter,
        }).select("_id");

        const refundJournalIds = refundJournalEntries.map((e) => e._id);
        const refundCount = refundJournalIds.length;

        let refundValueKobo = 0;
        if (refundCount > 0) {
          const refundValueResult = await LedgerLine.aggregate([
            {
              $match: {
                journalId: { $in: refundJournalIds },
                accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
                type: LedgerEntryType.CREDIT,
              },
            },
            {
              $group: {
                _id: null,
                totalRefundKobo: { $sum: "$amount" },
              },
            },
          ]);
          refundValueKobo = refundValueResult[0]?.totalRefundKobo ?? 0;
        }

        // ─────────────────────────────────────────────────────────────────
        // Response
        // ─────────────────────────────────────────────────────────────────
        return {
          success: true,
          data: {
            /**
             * The resolved date range sent back so the client can display
             * "Showing results from X to Y" accurately.
             */
            appliedRange: {
              from: range.from?.toISOString() ?? null,
              to: range.to.toISOString(),
              preset: input.preset,
            },
            metrics: {
              /**
               * Unique stores with at least one active, visible product
               * created within the selected period.
               */
              activeSellerCount,

              /**
               * Cumulative gross value of all successful transactions in Kobo.
               * Divide by 100 to display in Naira.
               */
              totalGmvKobo,

              /**
               * Number of successfully paid orders.
               */
              totalTransactionCount: transactionCount,

              /**
               * Refund metrics — both count and value in Kobo.
               */
              refunds: {
                count: refundCount,
                totalValueKobo: refundValueKobo,
              },
            },
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch platform metrics.");
      }
    }),

  /**
   * GET /admin/metrics/platform/breakdown
   *
   * Returns the same four metrics broken down by sub-period within the
   * selected time frame — useful for rendering trend charts on the dashboard.
   *
   * Breakdown granularity is inferred automatically from the preset:
   *   today / yesterday      → hourly  (24 buckets)
   *   last_7_days            → daily   (7 buckets)
   *   last_30_days / month   → daily   (up to 31 buckets)
   *   quarter / custom ≤90d  → weekly  (up to 13 buckets)
   *   year / last_year       → monthly (12 buckets)
   *   all_time               → monthly (all months with data)
   *   custom >90d            → monthly
   *
   * Requires VIEW_FINANCIAL_ANALYTICS permission.
   * All monetary values are in Kobo.
   */
  getPlatformMetricsBreakdown: baseProcedure
    .input(MetricsDateFilterSchema)
    .query(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;

      AdminGuard.from(unAuthenticatedAdmin).require(
        PERMISSIONS.VIEW_FINANCIAL_ANALYTICS,
      );

      try {
        await connectToDatabase();

        const range = resolveDateRange(input);
        const dateFilter = buildDateFilter(range);

        // Determine granularity
        type Granularity = "hour" | "day" | "week" | "month";
        let granularity: Granularity = "day";

        if (input.preset === "today" || input.preset === "yesterday") {
          granularity = "hour";
        } else if (
          input.preset === "last_7_days" ||
          input.preset === "last_30_days" ||
          input.preset === "this_month" ||
          input.preset === "last_month"
        ) {
          granularity = "day";
        } else if (
          input.preset === "this_quarter" ||
          input.preset === "last_quarter"
        ) {
          granularity = "week";
        } else if (
          input.preset === "this_year" ||
          input.preset === "last_year" ||
          input.preset === "all_time"
        ) {
          granularity = "month";
        } else if (input.preset === "custom" && range.from) {
          // Custom: use day-count to decide
          const dayDiff =
            (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24);
          if (dayDiff <= 2) granularity = "hour";
          else if (dayDiff <= 90) granularity = "day";
          else granularity = "month";
        }

        // MongoDB $dateToString format string per granularity
        const formatMap: Record<Granularity, string> = {
          hour: "%Y-%m-%dT%H:00:00Z",
          day: "%Y-%m-%d",
          week: "%G-W%V", // ISO year + ISO week number
          month: "%Y-%m",
        };
        const bucketFormat = formatMap[granularity];

        const [JournalEntry, TransactionRecord] = await Promise.all([
          getJournalEntryModel(),
          getTransactionRecordModel(),
        ]);

        // ── GMV breakdown ────────────────────────────────────────────────────────
        // Anchor on JournalEntry category PAYMENT_RECEIVED, then $lookup the
        // PLATFORM_ESCROW DEBIT line to get the gross amount per bucket.
        // Do NOT filter LedgerLine by accountType + direction directly —
        // PLATFORM_ESCROW is also touched by PAYOUT_COMPLETED, GATEWAY_FEE,
        // and GATEWAY_FEE_REVERSAL events.
        const gmvBreakdown = await JournalEntry.aggregate([
          {
            $match: {
              category: LedgerEntryCategory.PAYMENT_RECEIVED,
              ...dateFilter,
            },
          },
          {
            $lookup: {
              from: "ledgerlines",
              let: { jId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$journalId", "$$jId"] },
                    accountType: LedgerAccountType.PLATFORM_ESCROW,
                    type: LedgerEntryType.DEBIT,
                  },
                },
              ],
              as: "escrowLines",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: bucketFormat, date: "$createdAt" },
              },
              totalGmvKobo: {
                $sum: { $arrayElemAt: ["$escrowLines.amount", 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        // ── Transaction count breakdown ──────────────────────────────────
        const transactionBreakdown = await TransactionRecord.aggregate([
          {
            $match: {
              flutterwaveStatus: FlutterwavePaymentStatus.SUCCESSFUL,
              ...dateFilter,
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: bucketFormat, date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        // ── Refund breakdown ─────────────────────────────────────────────
        // Group refund journal entries by bucket first, then join ledger lines
        const refundBreakdown = await JournalEntry.aggregate([
          {
            $match: {
              category: LedgerEntryCategory.REFUND_ISSUED,
              ...dateFilter,
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: bucketFormat, date: "$createdAt" },
              },
              journalIds: { $push: "$_id" },
              refundCount: { $sum: 1 },
            },
          },
          // Join ledger lines to get the value per bucket
          {
            $lookup: {
              from: "ledgerlines",
              let: { jIds: "$journalIds" },
              pipeline: [
                {
                  $match: {
                    $expr: { $in: ["$journalId", "$$jIds"] },
                    accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
                    type: LedgerEntryType.CREDIT,
                  },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ],
              as: "refundLines",
            },
          },
          {
            $project: {
              _id: 1,
              refundCount: 1,
              totalRefundKobo: {
                $ifNull: [{ $arrayElemAt: ["$refundLines.total", 0] }, 0],
              },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        return {
          success: true,
          data: {
            appliedRange: {
              from: range.from?.toISOString() ?? null,
              to: range.to.toISOString(),
              preset: input.preset,
            },
            granularity,
            breakdown: {
              /**
               * Each entry: { period: string, totalGmvKobo: number }
               * `period` format varies by granularity — see formatMap above.
               */
              gmv: gmvBreakdown.map((b) => ({
                period: b._id as string,
                totalGmvKobo: b.totalGmvKobo as number,
              })),

              /**
               * Each entry: { period: string, count: number }
               */
              transactions: transactionBreakdown.map((b) => ({
                period: b._id as string,
                count: b.count as number,
              })),

              /**
               * Each entry: { period: string, count: number, totalValueKobo: number }
               */
              refunds: refundBreakdown.map((b) => ({
                period: b._id as string,
                count: b.refundCount as number,
                totalValueKobo: b.totalRefundKobo as number,
              })),
            },
          },
        };
      } catch (error) {
        throw handleTRPCError(
          error,
          "Failed to fetch platform metrics breakdown.",
        );
      }
    }),
});
