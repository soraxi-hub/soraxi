// admin-payouts.procedures.ts
import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getPayoutRecordModel } from "@/lib/db/models/payout-record.model";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { AdminGuard } from "@/domain/admin/admin-guard";
import { PayoutStatus } from "@/enums/financial.enums";
import { getStoreModel } from "@/lib/db/models/store.model";

export const adminPayoutRouter = createTRPCRouter({
  /**
   * Admin: Get paginated list of all payout records.
   * Requires VIEW_WITHDRAWALS permission.
   */
  getAdminWithdrawals: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z
          .enum(["all", ...Object.values(PayoutStatus)] as const)
          .default("all"),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;

      // ==================== Authentication & Authorization ====================
      // Admin Authentication Check
      AdminGuard.from(unAuthenticatedAdmin).require(
        PERMISSIONS.VIEW_WITHDRAWALS,
      );
      try {
        await connectToDatabase();
        const PayoutRecord = await getPayoutRecordModel();

        const filter: Record<string, any> = {};
        if (input.status !== "all") {
          filter.status = input.status;
        }

        const skip = (input.page - 1) * input.limit;

        const [payouts, total] = await Promise.all([
          PayoutRecord.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(input.limit)
            .lean(),
          PayoutRecord.countDocuments(filter),
        ]);

        // Summary counts by status
        const [totalInitiated, totalProcessing, totalCompleted, totalFailed] =
          await Promise.all([
            PayoutRecord.countDocuments({ status: PayoutStatus.INITIATED }),
            PayoutRecord.countDocuments({ status: PayoutStatus.PROCESSING }),
            PayoutRecord.countDocuments({ status: PayoutStatus.COMPLETED }),
            PayoutRecord.countDocuments({ status: PayoutStatus.FAILED }),
          ]);

        const withdrawals = payouts.map((payout) => ({
          payoutRecordId: payout._id.toString(),
          amountBreakdown: {
            requestedAmount: payout.amountBreakdown.requestedAmount,
            processingFee: payout.amountBreakdown.processingFee,
            netAmount: payout.amountBreakdown.netAmount,
          },
          status: payout.status,
          bankDetails: {
            accountNumber: payout.bankDetails.accountNumber,
            accountName: payout.bankDetails.accountName,
            bankCode: payout.bankDetails.bankCode,
          },
          failureReason: payout.failureReason ?? null,
          createdAt: payout.createdAt,
          updatedAt: payout.updatedAt,
        }));

        return {
          success: true,
          data: {
            withdrawals,
            pagination: {
              page: input.page,
              limit: input.limit,
              total,
              pages: Math.ceil(total / input.limit),
            },
            summary: {
              totalInitiated,
              totalProcessing,
              totalCompleted,
              totalFailed,
            },
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch payout records.");
      }
    }),

  /**
   * Admin: Get a single payout record by ID.
   * Requires VIEW_WITHDRAWALS permission.
   */
  getAdminWithdrawalById: baseProcedure
    .input(
      z.object({
        payoutRecordId: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;

      // ==================== Authentication & Authorization ====================
      // Admin Authentication Check
      AdminGuard.from(unAuthenticatedAdmin).require(
        PERMISSIONS.VIEW_WITHDRAWALS,
      );
      try {
        await connectToDatabase();
        const PayoutRecord = await getPayoutRecordModel();

        const payout = await PayoutRecord.findById(
          new mongoose.Types.ObjectId(input.payoutRecordId),
        ).lean();

        if (!payout) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payout record not found.",
          });
        }

        // Fetch store details (vendor)
        const Store = await getStoreModel();
        const store = await Store.findById(payout.vendorId)
          .select("name email")
          .lean();

        return {
          success: true,
          data: {
            payoutRecordId: payout._id.toString(),
            amountBreakdown: {
              requestedAmount: payout.amountBreakdown.requestedAmount,
              processingFee: payout.amountBreakdown.processingFee,
              netAmount: payout.amountBreakdown.netAmount,
            },
            status: payout.status,
            bankDetails: {
              accountNumber: payout.bankDetails.accountNumber,
              accountName: payout.bankDetails.accountName,
              bankCode: payout.bankDetails.bankCode,
            },
            failureReason: payout.failureReason ?? null,
            flutterwaveTransferId: payout.flutterwaveTransferId ?? null,
            createdAt: payout.createdAt,
            updatedAt: payout.updatedAt,
            store: store
              ? {
                  name: store.name,
                  email: store.storeEmail,
                }
              : null,
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch payout details.");
      }
    }),
});
