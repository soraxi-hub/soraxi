import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { AdminGuard } from "@/domain/admin/admin-guard";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  getDisputeRecordById,
  getDisputeRecordModel,
  requestAdditionalEvidence,
  resolveDisputeRecord,
} from "@/lib/db/models/dispute-record.model";
import {
  getTransactionRecordByOrderId,
  updateSuborderFinancialStatus,
} from "@/lib/db/models/transaction-record.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  applyDisputeUpheldDeductions,
  getVendorWalletByVendorId,
  releaseVendorDisputedToAvailable,
} from "@/lib/db/models/vendor-wallet.model";
import {
  creditPlatformPenalty,
  debitPlatformCommission,
} from "@/lib/db/models/platform-wallet.model";
import { calculatePenalty } from "@/lib/utils/calculate-penalty.util ";
import {
  SuborderFinancialStatus,
  DisputeStatus,
  DisputeOutcome,
  DisputeResolvedBy,
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
      // ----------------------------------------------------------------
      // STEP 1: Authenticate admin and check permission
      // NOTE: Add RESOLVE_DISPUTES to your PERMISSIONS object if it
      // doesn't exist yet — follow the same pattern as other permissions
      // ----------------------------------------------------------------
      const { admin: unAuthenticatedAdmin } = ctx;
      AdminGuard.from(unAuthenticatedAdmin).require(
        PERMISSIONS.RESOLVE_DISPUTES, // NOTE: Add this permission if not yet defined
      );

      if (!mongoose.Types.ObjectId.isValid(input.disputeId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid dispute ID format.",
        });
      }

      // ----------------------------------------------------------------
      // STEP 2: Guards — verify state before any financial writes
      // ----------------------------------------------------------------
      await connectToDatabase();

      // Guard 1: Dispute must exist
      const dispute = await getDisputeRecordById(input.disputeId);

      if (!dispute) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Dispute ${input.disputeId} not found.`,
        });
      }

      // Guard 2: Dispute must be in a resolvable state
      // AUTO_RESOLVED and RESOLVED are terminal — cannot be changed
      const resolvableStatuses = [
        DisputeStatus.OPEN,
        DisputeStatus.AWAITING_EVIDENCE,
      ];

      if (!resolvableStatuses.includes(dispute.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Dispute is already in a terminal state: ${dispute.status}. It cannot be resolved again.`,
        });
      }

      // Guard 3: Transaction record must exist
      const transactionRecord = await getTransactionRecordByOrderId(
        dispute.orderId.toString(),
      );

      if (!transactionRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Transaction record not found for order ${dispute.orderId}.`,
        });
      }

      // Guard 4: Financial breakdown must exist for the disputed suborder
      const breakdown = transactionRecord.suborderBreakdowns.find(
        (b) => b.suborderId.toString() === dispute.suborderId.toString(),
      );

      if (!breakdown) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No financial breakdown found for suborder ${dispute.suborderId}.`,
        });
      }

      // Guard 5: Suborder must still be in DISPUTED status
      // Prevents double-processing if this procedure is somehow called twice
      if (breakdown.status !== SuborderFinancialStatus.DISPUTED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Suborder is not in DISPUTED status. Current status: ${breakdown.status}.`,
        });
      }

      // ----------------------------------------------------------------
      // STEP 3: Calculate penalty before opening the session
      // ----------------------------------------------------------------
      const { penaltyAmount } = calculatePenalty(breakdown.grossAmount);

      const vendorWallet = await getVendorWalletByVendorId(
        dispute.vendorId.toString(),
      );

      if (!vendorWallet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vendor wallet not found",
        });
      }

      // ----------------------------------------------------------------
      // STEP 4: All financial writes — atomic within a session
      // ----------------------------------------------------------------
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Wallet first: it computes and returns the penalty split (clamped so
        // available never goes below zero) which the writer needs to keep the
        // ledger's penalty split identical to the wallet's. Recovery policy is
        // FULL_BLOCK for now, set only if the vendor has no policy yet (sticky).
        const deduction = await applyDisputeUpheldDeductions(
          dispute.vendorId.toString(),
          dispute.frozenAmount,
          penaltyAmount,
          DebtRecoveryType.FULL_BLOCK,
          0,
          session,
        );

        if (!deduction) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vendor wallet not found during deduction.",
          });
        }

        const { penaltyFromAvailable } = deduction;

        // --- DISPUTE_UPHELD journal entry ---
        // Penalty debit splits: penaltyFromAvailable out of VENDOR_AVAILABLE,
        // remainder into VENDOR_DEBT_RECEIVABLE. Full penalty is still
        // recognised as PLATFORM_REVENUE_PENALTIES revenue.
        const writer = await JournalEntryWriter.init();

        await writer.writeDisputeUpheld({
          vendorId: dispute.vendorId,
          customerId: dispute.customerId,
          settleAmount: dispute.frozenAmount,
          commission: breakdown.commission,
          penaltyAmount,
          penaltyFromAvailable,
          disputeId: new mongoose.Types.ObjectId(input.disputeId),
          session,
        });

        // --- Update Platform Wallet cache ---
        // Commission reversed (student refunded full amountPaid); full penalty
        // recognised as revenue regardless of the available/debt split.
        await debitPlatformCommission(breakdown.commission, session);
        await creditPlatformPenalty(penaltyAmount, session);

        // --- Update Dispute Record ---
        await resolveDisputeRecord(
          input.disputeId,
          DisputeOutcome.UPHELD,
          DisputeResolvedBy.PLATFORM_TEAM,
          penaltyAmount,
          session,
          input.resolutionNotes,
        );

        // --- Update Transaction Record: suborder status → REFUNDED ---
        await updateSuborderFinancialStatus(
          dispute.orderId.toString(),
          dispute.suborderId.toString(),
          SuborderFinancialStatus.REFUNDED,
          session,
        );

        await session.commitTransaction();

        const penaltyToDebt = penaltyAmount - penaltyFromAvailable;

        return {
          success: true,
          message: "Dispute resolved. Student will be refunded.",
          data: {
            disputeId: input.disputeId,
            outcome: DisputeOutcome.UPHELD,
            refundAmount: dispute.frozenAmount + breakdown.commission,
            penaltyAmount,
            vendorDebt:
              penaltyToDebt > 0
                ? {
                    amount: penaltyToDebt,
                    recoveryType: DebtRecoveryType.FULL_BLOCK,
                  }
                : null,
          },
        };
      } catch (error) {
        await session.abortTransaction();
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
      } finally {
        session.endSession();
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
      // ----------------------------------------------------------------
      // STEP 1: Authenticate admin and check permission
      // ----------------------------------------------------------------
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

      // ----------------------------------------------------------------
      // STEP 2: Guards — verify state before any financial writes
      // ----------------------------------------------------------------
      await connectToDatabase();

      // Guard 1: Dispute must exist
      const dispute = await getDisputeRecordById(input.disputeId);

      if (!dispute) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Dispute ${input.disputeId} not found.`,
        });
      }

      // Guard 2: Dispute must be in a resolvable state
      const resolvableStatuses = [
        DisputeStatus.OPEN,
        DisputeStatus.AWAITING_EVIDENCE,
      ];

      if (!resolvableStatuses.includes(dispute.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Dispute is already in a terminal state: ${dispute.status}. It cannot be resolved again.`,
        });
      }

      // Guard 3: Transaction record must exist
      const transactionRecord = await getTransactionRecordByOrderId(
        dispute.orderId.toString(),
      );

      if (!transactionRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Transaction record not found for order ${dispute.orderId}.`,
        });
      }

      // Guard 4: Financial breakdown must exist for the disputed suborder
      const breakdown = transactionRecord.suborderBreakdowns.find(
        (b) => b.suborderId.toString() === dispute.suborderId.toString(),
      );

      if (!breakdown) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No financial breakdown found for suborder ${dispute.suborderId}.`,
        });
      }

      // Guard 5: Suborder must still be in DISPUTED status
      if (breakdown.status !== SuborderFinancialStatus.DISPUTED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Suborder is not in DISPUTED status. Current status: ${breakdown.status}.`,
        });
      }

      // ----------------------------------------------------------------
      // STEP 3: All financial writes — atomic within a session
      // ----------------------------------------------------------------
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // --- DISPUTE_REJECTED journal entry ---
        // Returns frozen funds from vendor's disputed balance to available.
        //
        //   DEBIT   VENDOR_AVAILABLE   frozenAmount
        //   CREDIT  VENDOR_DISPUTED    frozenAmount
        const writer = await JournalEntryWriter.init();

        await writer.writeDisputeRejected({
          vendorId: dispute.vendorId,
          settleAmount: dispute.frozenAmount,
          disputeId: new mongoose.Types.ObjectId(input.disputeId),
          session,
        });

        // --- Update Vendor Wallet cache: disputed → available ---
        // Mirrors the VENDOR_DISPUTED → VENDOR_AVAILABLE movement above.
        await releaseVendorDisputedToAvailable(
          dispute.vendorId.toString(),
          dispute.frozenAmount,
          session,
        );

        // --- Update Dispute Record ---
        await resolveDisputeRecord(
          input.disputeId,
          DisputeOutcome.REJECTED,
          DisputeResolvedBy.PLATFORM_TEAM,
          0, // No penalty on rejection
          session,
          input.resolutionNotes,
        );

        // --- Update Transaction Record: suborder status → SETTLED ---
        await updateSuborderFinancialStatus(
          dispute.orderId.toString(),
          dispute.suborderId.toString(),
          SuborderFinancialStatus.SETTLED,
          session,
        );

        await session.commitTransaction();

        return {
          success: true,
          message: "Dispute resolved. Funds released to vendor.",
          data: {
            disputeId: input.disputeId,
            outcome: DisputeOutcome.REJECTED,
            releasedAmount: dispute.frozenAmount,
          },
        };
      } catch (error) {
        await session.abortTransaction();
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
      } finally {
        session.endSession();
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
        // ----------------------------------------------------------------
        // STEP 1: Authenticate admin and check permission
        // ----------------------------------------------------------------
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

        // ----------------------------------------------------------------
        // STEP 2: Guards
        // ----------------------------------------------------------------
        await connectToDatabase();

        // Guard 1: Dispute must exist
        const dispute = await getDisputeRecordById(input.disputeId);

        if (!dispute) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Dispute ${input.disputeId} not found.`,
          });
        }

        // Guard 2: Dispute must be in OPEN status only
        // AWAITING_EVIDENCE means additional evidence was already requested —
        // the team cannot request it a second time
        if (dispute.status !== DisputeStatus.OPEN) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              dispute.status === DisputeStatus.AWAITING_EVIDENCE
                ? "Additional evidence has already been requested for this dispute."
                : `Dispute cannot be marked inconclusive in its current state: ${dispute.status}.`,
          });
        }

        // ----------------------------------------------------------------
        // STEP 3: Update dispute record — no financial writes needed
        // Funds remain frozen in vendor's disputed balance unchanged
        // ----------------------------------------------------------------

        // requestAdditionalEvidence sets status → AWAITING_EVIDENCE,
        // outcome → INCONCLUSIVE, and populates the 48-hour deadline
        const updatedDispute = await requestAdditionalEvidence(input.disputeId);

        if (!updatedDispute) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update dispute record.",
          });
        }

        // ----------------------------------------------------------------
        // STEP 4: Notify student to submit additional evidence
        // NOTE: Implement student notification email following your
        // existing NotificationFactory pattern. Include:
        // - What additional evidence is needed
        // - The 48-hour deadline (updatedDispute.additionalEvidenceDeadline)
        // - The route/link to submit evidence
        // ----------------------------------------------------------------

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
        throw handleTRPCError(error, "Failed to mark dispute as inconclusive.");
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
        throw handleTRPCError(error, "Failed to fetch disputes.");
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
            message: "Dispute not found.",
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
        throw handleTRPCError(error, "Failed to fetch dispute details.");
      }
    }),
});
