import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { FundReleaseQueryService } from "@/services/fund-release-query.service";
import { FundReleaseStatus } from "@/lib/db/models/fund-release.model";
import mongoose from "mongoose";

/**
 * Sorting enum for TRPC
 */
const SortEnum = z.enum(["newest", "oldest", "amount"]);

/**
 * Fund Release Router
 * Handles listing & filtering store fund releases
 */
export const storeFundReleaseRouter = createTRPCRouter({
  /**
   * @procedure Get Paginated Fund Releases for Store
   * @description Fetches fund releases for the authenticated store. This route is for stores and not for admins.
   * @input Pagination, filters, sort parameters
   * @returns Paginated fund release list + pagination metadata
   */
  getStoreFundReleases: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(FundReleaseStatus).optional(),
        orderId: z.string().optional(),
        sort: SortEnum.default("newest"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { store } = ctx;

        if (!store) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please login to view fund releases.",
          });
        }

        // Pagination (using service helper for safety)
        const pagination = FundReleaseQueryService.validatePagination(
          input.page,
          input.pageSize
        );

        // Sorting
        const sort =
          input.sort === "newest"
            ? { field: "createdAt" as const, order: "desc" as const }
            : input.sort === "oldest"
              ? { field: "createdAt" as const, order: "asc" as const }
              : {
                  field: "scheduledReleaseTime" as const,
                  order: "desc" as const,
                };

        // Fetch fund releases
        const result = await FundReleaseQueryService.getStoreFundReleases(
          store.id,
          {
            status: input.status,
            orderId: input.orderId,
          },
          pagination,
          sort
        );

        return {
          success: true,
          data: result.data,
          pagination: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          },
        };
      } catch (error) {
        console.error("[TRPC] Store fund releases failed:", error);
        throw handleTRPCError(error, "Failed to fetch fund releases");
      }
    }),

  getStoreSummaryStats: baseProcedure.query(async ({ ctx }) => {
    const { store } = ctx;

    try {
      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Please login to view fund releases.",
        });
      }

      const stats = await FundReleaseQueryService.getStoreSummaryStats(
        store.id
      );

      /**
       * Normalize output so the frontend never breaks.
       * If MongoDB returns grouped statuses differently,
       * we ensure all keys exist.
       */

      return {
        pending: stats[FundReleaseStatus.Pending] ?? {
          count: 0,
          totalAmount: 0,
        },
        ready: stats[FundReleaseStatus.Ready] ?? { count: 0, totalAmount: 0 },
        released: stats[FundReleaseStatus.Released] ?? {
          count: 0,
          totalAmount: 0,
        },
        failed: stats[FundReleaseStatus.Failed] ?? {
          count: 0,
          totalAmount: 0,
        },
      };
    } catch (error) {
      console.error(
        "[TRPC] Failed to fetch fund releases summary stats:",
        error
      );
      throw handleTRPCError(
        error,
        "Failed to fetch fund releases summary stats"
      );
    }
  }),

  getById: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const { store } = ctx;

      try {
        if (!store) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please login to view fund releases.",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid fund release ID.",
          });
        }

        const enrichedFundRelease =
          await FundReleaseQueryService.getFundReleaseById(id, store.id);

        return enrichedFundRelease;
      } catch (error) {
        console.error("[TRPC] Failed to fetch fund releases details:", error);
        throw handleTRPCError(error, "Failed to fetch fund releases details");
      }
    }),
});
