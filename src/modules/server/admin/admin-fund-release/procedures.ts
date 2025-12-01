import { z } from "zod";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { AdminFundReleaseQueryService } from "@/services/admin-fund-release-query.service";
import {
  FundReleaseStatus,
  StoreTierEnum,
} from "@/lib/db/models/fund-release.model";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import { PERMISSIONS } from "@/modules/admin/security/permissions";

/**
 * Sorting enum for TRPC (Admin)
 */
const AdminSortEnum = z.enum(["newest", "oldest", "amount"]);

/**
 * Risk level enum (Admin)
 */
const RiskLevelEnum = z.enum(["high", "medium", "low"]);

/**
 * Admin Fund Releases Router
 * Fetches all fund releases across all stores with admin-level filtering
 */
export const adminFundReleaseRouter = createTRPCRouter({
  /**
   * @procedure getAll
   * @description Admin master query for all fund releases with pagination, filters and sorting
   */
  getAll: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(FundReleaseStatus).optional(),
        storeTier: z.nativeEnum(StoreTierEnum).optional(),
        riskLevel: RiskLevelEnum.optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        storeId: z.string().length(24).optional(),
        orderId: z.string().length(24).optional(),
        sort: AdminSortEnum.default("newest"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { admin } = ctx;
        const {
          page,
          pageSize,
          status,
          storeTier,
          riskLevel,
          storeId,
          orderId,
        } = input;

        /**
         * Admin Authentication Check
         *
         * Verifies that the request is coming from an authenticated admin user
         * with appropriate permissions to view detailed escrow data.
         */
        if (!admin || !checkAdminPermission(admin, [PERMISSIONS.VIEW_ESCROW])) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin authentication required",
          });
        }

        // Pagination
        const pagination = AdminFundReleaseQueryService.validatePagination(
          page,
          pageSize
        );

        // Sorting
        const sort =
          input.sort === "newest"
            ? { field: "createdAt" as const, order: "desc" as const }
            : input.sort === "oldest"
              ? { field: "createdAt" as const, order: "asc" as const }
              : { field: "settlement.amount" as const, order: "desc" as const };

        // Convert dates from strings → Date
        const dateFrom = input.dateFrom ? new Date(input.dateFrom) : undefined;
        const dateTo = input.dateTo ? new Date(input.dateTo) : undefined;

        // Fetch data
        const result = await AdminFundReleaseQueryService.getAllFundReleases(
          {
            status,
            storeTier,
            riskLevel,
            dateFrom,
            dateTo,
            storeId,
            orderId,
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
        console.error("[TRPC:ADMIN] Fund releases failed:", error);
        throw handleTRPCError(error, "Failed to fetch fund releases");
      }
    }),

  getDashboardStats: baseProcedure.query(async ({ ctx }) => {
    try {
      const { admin } = ctx;

      /**
       * Admin Authentication Check
       *
       * Verifies that the request is coming from an authenticated admin user
       * with appropriate permissions to view detailed escrow data.
       */
      if (!admin || !checkAdminPermission(admin, [PERMISSIONS.VIEW_ESCROW])) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Admin authentication required",
        });
      }
      // Dashboard statistics
      const stats = await AdminFundReleaseQueryService.getDashboardStats();

      return stats;
    } catch (error) {
      console.error("[TRPC:ADMIN] Fund release dashboard stats failed:", error);
      throw handleTRPCError(
        error,
        "Failed to fetch fund release dashboard stats"
      );
    }
  }),

  /**
   * @procedure getById
   * @description Fetch a single fund release + order + store + related subOrder
   */
  getById: baseProcedure
    .input(
      z.object({
        id: z.string().length(24, "Invalid fund release ID"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { admin } = ctx;

        if (!admin || !checkAdminPermission(admin, [PERMISSIONS.VIEW_ESCROW])) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin authentication required.",
          });
        }

        const data = await AdminFundReleaseQueryService.getFundReleaseById(
          input.id
        );

        if (!data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fund release not found",
          });
        }

        return { success: true, data };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch fund release details");
      }
    }),

  /**
   * @procedure adminAction
   * @description Admin actions: approve, force-release, reverse, add-notes
   */
  adminAction: baseProcedure
    .input(
      z.object({
        id: z.string().length(24),
        action: z.enum(["approve", "force-release", "reverse", "add-notes"]),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { admin } = ctx;

        if (
          !admin ||
          !checkAdminPermission(admin, [PERMISSIONS.PROCESS_ESCROW])
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin authentication required.",
          });
        }

        const data = await AdminFundReleaseQueryService.adminAction(
          input.id,
          input.action,
          admin,
          input.adminNotes
        );

        if (!data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fund release not found",
          });
        }

        return {
          success: true,
          data,
          message: `Action '${input.action}' completed successfully`,
        };
      } catch (error) {
        throw handleTRPCError(error, "Action failed");
      }
    }),
});
