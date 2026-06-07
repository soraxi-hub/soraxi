import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getTransactionRecordByOrderId } from "@/lib/db/models/transaction-record.model";
import {
  getDisputeRecordById,
  getActiveDisputeBySuborderId,
} from "@/lib/db/models/dispute-record.model";
import { SuborderFinancialStatus } from "@/enums/financial.enums";

export const customerDisputeRouter = createTRPCRouter({
  /**
   * Get the financial status of each suborder for a given order.
   *
   * Used by the order detail page to determine what to show
   * at the suborder level:
   * - PENDING   → show "Raise Dispute" button
   * - DISPUTED  → show "Dispute Open" badge + link to dispute status page
   * - SETTLED   → show nothing (funds released, all good)
   * - REFUNDED  → show "Refunded" badge
   */
  getSuborderFinancialStatuses: baseProcedure
    .input(
      z.object({
        orderId: z.string().min(1, "Order ID is required"),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to view order details.",
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

        // No transaction record means payment hasn't been confirmed yet
        // Return empty map — no dispute actions available
        if (!transactionRecord) {
          return { statuses: {} };
        }

        // Build a map of suborderId → { status, disputeId }
        // disputeId is populated when status is DISPUTED so the
        // UI can link directly to the dispute status page
        const statuses: Record<
          string,
          {
            status: SuborderFinancialStatus;
            disputeId: string | null;
          }
        > = {};

        for (const breakdown of transactionRecord.suborderBreakdowns) {
          const suborderId = breakdown.suborderId.toString();
          let disputeId: string | null = null;

          // If disputed, fetch the active dispute ID for the status page link
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
          };
        }

        return { statuses };
      } catch (error) {
        throw handleTRPCError(
          error,
          "Failed to fetch suborder financial statuses.",
        );
      }
    }),

  /**
   * Get full dispute details for the dispute status page.
   * Only accessible by the student who raised the dispute.
   */
  getDisputeById: baseProcedure
    .input(
      z.object({
        disputeId: z.string().min(1, "Dispute ID is required"),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to view dispute details.",
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

        // Ensure the dispute belongs to this student
        if (dispute.customerId.toString() !== user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorised to view this dispute.",
          });
        }

        return {
          disputeId: (dispute._id as mongoose.Types.ObjectId).toString(),
          status: dispute.status,
          outcome: dispute.outcome ?? null,
          reason: dispute.reason,
          evidence: dispute.evidence,
          frozenAmount: dispute.frozenAmount,
          penaltyAmount: dispute.penaltyAmount,
          openedAt: dispute.openedAt,
          deadline: dispute.deadline,
          resolvedAt: dispute.resolvedAt ?? null,
          resolvedBy: dispute.resolvedBy ?? null,
          additionalEvidenceDeadline:
            dispute.additionalEvidenceDeadline ?? null,
          additionalEvidence: dispute.additionalEvidence ?? [],
          suborderId: dispute.suborderId.toString(),
          orderId: dispute.orderId.toString(),
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch dispute details.");
      }
    }),
});
