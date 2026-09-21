import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { AdminGuard } from "@/domain/admin/admin-guard";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getDisputeRecordModel } from "@/lib/db/models/dispute-record.model";
import { getTransactionRecordByOrderId } from "@/lib/db/models/transaction-record.model";
import {
  DisputeStatus,
  DisputeOutcome,
  DebtRecoveryType,
} from "@/enums/financial.enums";
import { TRPCError } from "@trpc/server";
import { koboToNaira } from "@/lib/utils/naira";
import { getOrderModel } from "@/lib/db/models/order.model";
import { DateFormatter } from "@/lib/utils/date-formatter";
import { formatOrderNumber } from "@/lib/utils/order-number";
import { toAdminProofView } from "@/domain/orders/delivery-proof-projection";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import { DisputeService } from "@/services/disputes/dispute.service";

export const adminDisputeRouter = createTRPCRouter({
  /**
   * Resolve Dispute — Upheld (Stage 4A)
   *
   * Triggered when the platform team rules in favour of the customer.
   *
   * Financial writes (all atomic within a session):
   * 1. REFUND_ISSUED ledger entry — debit disputed amount, credit customer
   * 2. PENALTY_APPLIED ledger entry — debit penalty from vendor
   * 3. Update Vendor Wallet — remove frozen funds, apply penalty (may go negative)
   * 4. Update Platform Wallet — credit penalty as revenue
   * 5. Update Dispute Record — status: RESOLVED, outcome: UPHELD
   * 6. Update Transaction Record — suborder status: REFUNDED
   */
  resolveDisputeUpheld: baseProcedure
    .input(
      z.object({
        disputeId: z.string().min(1, "Dispute ID is required"),
        resolutionNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;

      AdminGuard.from(unAuthenticatedAdmin).require(
        PERMISSIONS.RESOLVE_DISPUTES,
      );

      // Financial dispute resolution belongs to the application service. In
      // particular it creates the INITIATED RefundRecord in the same MongoDB
      // transaction as the upheld liability, wallet and status writes.
      try {
        const result = await DisputeService.upholdDispute({
          disputeId: input.disputeId,
          resolutionNotes: input.resolutionNotes,
        });
        return {
          success: true,
          message: "Dispute resolved. Student will be refunded.",
          data: {
            disputeId: input.disputeId,
            outcome: DisputeOutcome.UPHELD,
            refundAmount: result.refundAmount,
            refundRecordId: (
              result.refundRecord._id as mongoose.Types.ObjectId
            ).toString(),
            penaltyAmount: result.penaltyAmount,
            vendorDebt:
              result.penaltyToDebt > 0
                ? {
                    amount: result.penaltyToDebt,
                    recoveryType: DebtRecoveryType.FULL_BLOCK,
                  }
                : null,
          },
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:admin.disputes.resolveDisputeUpheld",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(error);
      }
    }),

  /**
   * Resolve Dispute — Rejected (Stage 4B)
   *
   * Triggered when the platform team rules in favour of the vendor.
   *
   * Financial writes (all atomic within a session):
   * 1. FUNDS_RELEASED ledger entry — move frozen amount from disputed to available
   * 2. Update Vendor Wallet — disputed → available
   * 3. Update Dispute Record — status: RESOLVED, outcome: REJECTED
   * 4. Update Transaction Record — suborder status: SETTLED
   */
  resolveDisputeRejected: baseProcedure
    .input(
      z.object({
        disputeId: z.string().min(1, "Dispute ID is required"),
        resolutionNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { admin: unAuthenticatedAdmin } = ctx;

        AdminGuard.from(unAuthenticatedAdmin).require(
          PERMISSIONS.RESOLVE_DISPUTES,
        );

        const result = await DisputeService.rejectDispute({
          disputeId: input.disputeId,
          resolutionNotes: input.resolutionNotes,
        });

        return {
          success: true,
          message: "Dispute resolved. Funds released to vendor.",
          data: {
            disputeId: input.disputeId,
            outcome: DisputeOutcome.REJECTED,
            releasedAmount: result.releasedAmount,
          },
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:admin.disputes.resolveDisputeRejected",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw error;
      }
    }),

  /**
   * Mark Dispute as Inconclusive (Stage 4D — Piece 1)
   *
   * Triggered when the platform team cannot make a clear judgment call
   * from the evidence provided.
   *
   * No financial writes — funds remain frozen in vendor's disputed balance.
   * The dispute status moves to AWAITING_EVIDENCE and the student has
   * 48 hours to submit additional evidence before the system auto-rejects.
   */
  markDisputeInconclusive: baseProcedure
    .input(
      z.object({
        disputeId: z.string().min(1, "Dispute ID is required"),
        resolutionNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { admin: unAuthenticatedAdmin } = ctx;
        AdminGuard.from(unAuthenticatedAdmin).require(
          PERMISSIONS.RESOLVE_DISPUTES,
        );

        const updatedDispute = await DisputeService.markInconclusive({
          disputeId: input.disputeId,
        });

        return {
          success: true,
          message:
            "Dispute marked as inconclusive. Student has been notified to submit additional evidence.",
          data: {
            disputeId: input.disputeId,
            status: updatedDispute.status,
            additionalEvidenceDeadline:
              updatedDispute.additionalEvidenceDeadline,
          },
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:admin.disputes.markDisputeInconclusive",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't mark this dispute inconclusive. Please try again.",
        );
      }
    }),

  // ---------------------------------------------------------------
  // listDisputes
  // Paginated dispute list sorted by deadline ascending (most urgent first)
  // Filterable by status
  // ---------------------------------------------------------------
  listDisputes: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(15),
        status: z
          .enum([
            "all",
            DisputeStatus.OPEN,
            DisputeStatus.AWAITING_EVIDENCE,
            DisputeStatus.RESOLVED,
            DisputeStatus.AUTO_RESOLVED,
          ])
          .default("all"),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const { admin: unAuthenticatedAdmin } = ctx;
        AdminGuard.from(unAuthenticatedAdmin).require(
          PERMISSIONS.RESOLVE_DISPUTES,
        );

        await connectToDatabase();
        const DisputeRecord = await getDisputeRecordModel();

        const filter: Record<string, any> = {};
        if (input.status !== "all") {
          filter.status = input.status;
        }

        const skip = (input.page - 1) * input.limit;
        const total = await DisputeRecord.countDocuments(filter);

        // Sort by deadline ascending — most urgent (soonest deadline) appears first
        // For resolved disputes, deadline is in the past so they naturally appear last
        const disputes = await DisputeRecord.find(filter)
          .sort({ deadline: 1 })
          .skip(skip)
          .limit(input.limit)
          .lean();

        return {
          disputes: disputes.map((dispute) => ({
            disputeId: (dispute._id as mongoose.Types.ObjectId).toString(),
            status: dispute.status,
            outcome: dispute.outcome ?? null,
            frozenAmount: koboToNaira(dispute.frozenAmount),
            openedAt: dispute.openedAt,
            deadline: dispute.deadline,
            resolvedAt: dispute.resolvedAt ?? null,
            // Business days remaining — used for urgency indicator in the UI
            businessDaysRemaining:
              dispute.status === DisputeStatus.OPEN ||
              dispute.status === DisputeStatus.AWAITING_EVIDENCE
                ? DateFormatter.businessDaysUntil(
                    new Date(dispute.deadline),
                    [0, 6],
                  )
                : null,
            orderId: dispute.orderId.toString(),
            suborderId: dispute.suborderId.toString(),
            studentId: dispute.customerId.toString(),
            vendorId: dispute.vendorId.toString(),
          })),
          pagination: {
            page: input.page,
            limit: input.limit,
            total,
            pages: Math.ceil(total / input.limit),
          },
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:admin.disputes.listDisputes",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't load disputes. Please try again.",
        );
      }
    }),

  // ---------------------------------------------------------------
  // getAdminDisputeById
  // Full dispute detail for the admin resolution page
  // Includes order context and full financial breakdown
  // ---------------------------------------------------------------
  getAdminDisputeById: baseProcedure
    .input(z.object({ disputeId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        const { admin: unAuthenticatedAdmin } = ctx;
        AdminGuard.from(unAuthenticatedAdmin).require(
          PERMISSIONS.RESOLVE_DISPUTES,
        );

        if (!mongoose.Types.ObjectId.isValid(input.disputeId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid dispute ID format.",
          });
        }

        await connectToDatabase();
        const DisputeRecord = await getDisputeRecordModel();

        const dispute = await DisputeRecord.findById(input.disputeId).lean();

        if (!dispute) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "No dispute exists with that ID. It may have been resolved and archived.",
          });
        }

        // Fetch the transaction record to get the financial breakdown
        // for the disputed suborder
        const transactionRecord = await getTransactionRecordByOrderId(
          dispute.orderId.toString(),
        );

        const breakdown = transactionRecord?.suborderBreakdowns.find(
          (b) => b.suborderId.toString() === dispute.suborderId.toString(),
        );

        // Fetch the order for product context
        const Order = await getOrderModel();
        const order = await Order.findById(dispute.orderId)
          .select("subOrders userId totalAmount paymentStatus createdAt")
          .lean();

        const subOrder = order?.subOrders.find(
          (s) => s._id?.toString() === dispute.suborderId.toString(),
        );

        const businessDaysRemaining =
          dispute.status === DisputeStatus.OPEN ||
          dispute.status === DisputeStatus.AWAITING_EVIDENCE
            ? DateFormatter.businessDaysUntil(
                new Date(dispute.deadline),
                [0, 6],
              )
            : null;

        return {
          disputeId: (dispute._id as mongoose.Types.ObjectId).toString(),
          status: dispute.status,
          outcome: dispute.outcome ?? null,
          reason: dispute.reason,
          evidence: dispute.evidence,
          additionalEvidence: dispute.additionalEvidence ?? [],
          frozenAmount: dispute.frozenAmount,
          frozenAmountNaira: koboToNaira(dispute.frozenAmount),
          penaltyAmount: dispute.penaltyAmount,
          openedAt: dispute.openedAt,
          deadline: dispute.deadline,
          businessDaysRemaining,
          warningIssuedAt: dispute.warningIssuedAt ?? null,
          resolvedAt: dispute.resolvedAt ?? null,
          resolvedBy: dispute.resolvedBy ?? null,
          resolutionNotes: dispute.resolutionNotes ?? null,
          additionalEvidenceDeadline:
            dispute.additionalEvidenceDeadline ?? null,
          orderId: dispute.orderId.toString(),
          suborderId: dispute.suborderId.toString(),
          studentId: dispute.customerId.toString(),
          vendorId: dispute.vendorId.toString(),
          // Financial breakdown for this specific suborder
          financialBreakdown: breakdown
            ? {
                grossAmount: koboToNaira(breakdown.grossAmount),
                commission: koboToNaira(breakdown.commission),
                settleAmount: koboToNaira(breakdown.settleAmount),
              }
            : null,
          // Suborder products for context
          products:
            subOrder?.products.map((p) => ({
              name: p.productSnapshot.name,
              quantity: p.productSnapshot.quantity,
              price: koboToNaira(p.productSnapshot.price),
              image: p.productSnapshot.images?.[0] ?? null,
            })) ?? [],
          /**
           * What happened at handover.
           *
           * Neither the code nor the link is projected — a moderator needs to
           * know *that* delivery was attested and by what route, never the
           * secrets themselves.
           *
           * This answers only "did the parcel arrive?". Disputes about wrong
           * or damaged items are about something else entirely, and the UI
           * says so explicitly rather than letting a green panel imply a
           * verdict.
           */
          deliveryRecord: subOrder
            ? toAdminProofView(subOrder.deliveryProof)
            : null,
          subOrderReference: subOrder
            ? formatOrderNumber(
                subOrder._id.toString(),
                order?.createdAt ?? dispute.openedAt,
              )
            : null,
        };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:admin.disputes.getAdminDisputeById",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't load these dispute details. Please try again.",
        );
      }
    }),
});
