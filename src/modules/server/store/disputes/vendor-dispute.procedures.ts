import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getTransactionRecordByOrderId } from "@/lib/db/models/transaction-record.model";
import {
  getActiveDisputeBySuborderId,
  getDisputeRecordById,
} from "@/lib/db/models/dispute-record.model";
import { getVendorWalletByVendorId } from "@/lib/db/models/vendor-wallet.model";
import { SuborderFinancialStatus } from "@/enums/financial.enums";
import { koboToNaira } from "@/lib/utils/naira";

export const vendorDisputeRouter = createTRPCRouter({
  /**
   * Get financial statuses for all suborders in a given order.
   *
   * Used by the vendor order detail page to determine what to show
   * at the suborder level:
   * - PENDING   → nothing shown (funds awaiting confirmation, normal state)
   * - DISPUTED  → show frozen funds alert + link to dispute detail page
   * - SETTLED   → nothing shown (funds released, all good)
   * - REFUNDED  → show refunded badge (dispute upheld against vendor)
   *
   * Also returns the vendor's current wallet balances so the vendor
   * can see the impact of a frozen dispute on their overall balance.
   */
  getOrderFinancialStatuses: baseProcedure
    .input(
      z.object({
        orderId: z.string().min(1, "Order ID is required"),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const { store: storeToken } = ctx;

        if (!storeToken?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please login to your store.",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(input.orderId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid order ID format.",
          });
        }

        await connectToDatabase();

        const transactionRecord = await getTransactionRecordByOrderId(
          input.orderId,
        );

        if (!transactionRecord) {
          return { statuses: {}, walletBalances: null };
        }

        // Only return statuses for suborders belonging to this store
        // A vendor should never see financial data for another vendor's suborder
        const storeSuborders = transactionRecord.suborderBreakdowns.filter(
          (b) => b.vendorId.toString() === storeToken.id,
        );

        const statuses: Record<
          string,
          {
            status: SuborderFinancialStatus;
            disputeId: string | null;
            frozenAmount: number | null;
          }
        > = {};

        for (const breakdown of storeSuborders) {
          const suborderId = breakdown.suborderId.toString();
          let disputeId: string | null = null;

          if (breakdown.status === SuborderFinancialStatus.DISPUTED) {
            const activeDispute =
              await getActiveDisputeBySuborderId(suborderId);
            disputeId = activeDispute
              ? (activeDispute._id as mongoose.Types.ObjectId).toString()
              : null;
          }

          statuses[suborderId] = {
            status: breakdown.status,
            disputeId,
            // Show frozen amount only when disputed so vendor knows exactly
            // how much of their wallet is affected
            frozenAmount:
              breakdown.status === SuborderFinancialStatus.DISPUTED
                ? breakdown.settleAmount
                : null,
          };
        }

        // Fetch wallet balances so vendor can see overall financial impact
        const vendorWallet = await getVendorWalletByVendorId(storeToken.id);

        return {
          statuses,
          walletBalances: vendorWallet
            ? {
                available: koboToNaira(vendorWallet.balances.available),
                pending: koboToNaira(vendorWallet.balances.pending),
                disputed: koboToNaira(vendorWallet.balances.disputed),
              }
            : null,
        };
      } catch (error) {
        throw handleTRPCError(
          error,
          "Failed to fetch order financial statuses.",
        );
      }
    }),

  /**
   * Get dispute details for the vendor dispute detail page.
   * Only accessible by the vendor whose suborder is disputed.
   */
  getDisputeById: baseProcedure
    .input(
      z.object({
        disputeId: z.string().min(1, "Dispute ID is required"),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const { store: storeToken } = ctx;

        if (!storeToken?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please login to your store.",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(input.disputeId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid dispute ID format.",
          });
        }

        await connectToDatabase();

        const dispute = await getDisputeRecordById(input.disputeId);

        if (!dispute) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dispute not found.",
          });
        }

        // Ensure this dispute belongs to this vendor's suborder
        if (dispute.vendorId.toString() !== storeToken.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorised to view this dispute.",
          });
        }

        return {
          disputeId: (dispute._id as mongoose.Types.ObjectId).toString(),
          status: dispute.status,
          outcome: dispute.outcome ?? null,
          // Vendor sees the student's complaint and evidence — read only
          reason: dispute.reason,
          evidence: dispute.evidence,
          additionalEvidence: dispute.additionalEvidence ?? [],
          frozenAmount: dispute.frozenAmount,
          penaltyAmount: dispute.penaltyAmount,
          openedAt: dispute.openedAt,
          deadline: dispute.deadline,
          resolvedAt: dispute.resolvedAt ?? null,
          resolvedBy: dispute.resolvedBy ?? null,
          orderId: dispute.orderId.toString(),
          suborderId: dispute.suborderId.toString(),
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch dispute details.");
      }
    }),

  /**
   * Get all disputes for this store — used by the vendor disputes list page.
   * Returns disputes in reverse chronological order with pagination.
   *
   * NOTE: The disputes list page is deferred — this procedure is a
   * placeholder stub to be implemented when that page is built.
   */
  getStoreDisputes: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const { store: storeToken } = ctx;

        if (!storeToken?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please login to your store.",
          });
        }

        // NOTE: Implement full pagination when the disputes list page is built
        // Use getDisputeRecordModel() and query by vendorId with pagination
        // following the same pattern as CouponQueryService.listCoupons

        return {
          disputes: [],
          pagination: {
            page: input.page,
            limit: input.limit,
            total: 0,
            pages: 0,
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch store disputes.");
      }
    }),
});
