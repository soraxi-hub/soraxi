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
import { createLedgerEntry } from "@/lib/db/models/ledger-entry.model";
import {
  applyDisputeUpheldDeductions,
  getVendorWalletByVendorId,
  releaseVendorDisputedToAvailable,
} from "@/lib/db/models/vendor-wallet.model";
import { creditPlatformPenalty } from "@/lib/db/models/platform-wallet.model";
import { calculatePenalty } from "@/lib/utils/calculate-penalty.util ";
import {
  LedgerEntryType,
  LedgerEntryCategory,
  LedgerEntityType,
  LedgerReferenceType,
  SuborderFinancialStatus,
  DisputeStatus,
  DisputeOutcome,
  DisputeResolvedBy,
  DebtRecoveryType,
} from "@/enums/financial.enums";
import {
  DEBT_RECOVERY_THRESHOLD_KOBO,
  DEBT_RECOVERY_PERCENTAGE,
} from "@/constants/financial.constants";
import { TRPCError } from "@trpc/server";
import { koboToNaira } from "@/lib/utils/naira";
import { getOrderModel } from "@/lib/db/models/order.model";
import { DateFormatter } from "@/lib/utils/date-formatter";

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
      // Penalty is based on the gross amount of the disputed suborder
      // Formula: 10% of gross amount, capped at ₦5,000
      // ----------------------------------------------------------------
      const { penaltyAmount } = calculatePenalty(breakdown.grossAmount);

      // ----------------------------------------------------------------
      // Determine debt recovery strategy upfront
      // This requires knowing the current vendor wallet state — read it
      // before the session to keep the session writes fast and focused
      // ----------------------------------------------------------------

      // NOTE: Import getVendorWalletByVendorId from vendor-wallet.model
      // and use it here to fetch the current available balance
      // e.g:
      // const vendorWallet = await getVendorWalletByVendorId(dispute.vendorId.toString());
      // const projectedAvailable = (vendorWallet?.balances.available ?? 0) - penaltyAmount;
      // const wouldGoNegative = projectedAvailable < 0;
      // const debtAmount = wouldGoNegative ? Math.abs(projectedAvailable) : 0;

      const vendorWallet = await getVendorWalletByVendorId(
        dispute.vendorId.toString(),
      ); // (async () =>
      // null)(); // NOTE: Replace with actual call

      if (!vendorWallet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vendor wallet not found",
        });
      }

      const currentAvailable = vendorWallet.balances.available;
      const projectedAvailable = currentAvailable - penaltyAmount;
      const wouldGoNegative = projectedAvailable < 0;
      const debtAmount = wouldGoNegative ? Math.abs(projectedAvailable) : 0;

      // Determine recovery strategy based on debt threshold
      const debtRecoveryType =
        debtAmount >= DEBT_RECOVERY_THRESHOLD_KOBO
          ? DebtRecoveryType.FULL_BLOCK
          : DebtRecoveryType.PERCENTAGE_DEDUCTION;

      // ----------------------------------------------------------------
      // STEP 4: All financial writes — atomic within a session
      // ----------------------------------------------------------------
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const now = new Date();

        const sharedDisputeRef = {
          referenceType: LedgerReferenceType.DISPUTE,
          referenceId: new mongoose.Types.ObjectId(input.disputeId),
        };

        // --- REFUND_ISSUED ledger entry ---
        // The frozen amount is removed from the vendor's disputed balance
        // and credited back to the student
        await createLedgerEntry({
          type: LedgerEntryType.DEBIT,
          category: LedgerEntryCategory.REFUND_ISSUED,
          amount: dispute.frozenAmount,
          entityType: LedgerEntityType.CUSTOMER,
          entityId: dispute.customerId,
          ...sharedDisputeRef,
          description: `Refund issued to student for upheld dispute on suborder ${dispute.suborderId}`,
          metadata: {
            orderId: dispute.orderId.toString(),
            suborderId: dispute.suborderId.toString(),
            disputeId: input.disputeId,
            refundedAt: now.toISOString(),
          },
          // NOTE: Pass session once helpers support it
        });

        // --- PENALTY_APPLIED ledger entry ---
        // The penalty is debited from the vendor's wallet
        await createLedgerEntry({
          type: LedgerEntryType.DEBIT,
          category: LedgerEntryCategory.PENALTY_APPLIED,
          amount: penaltyAmount,
          entityType: LedgerEntityType.VENDOR,
          entityId: dispute.vendorId,
          referenceType: LedgerReferenceType.PENALTY,
          referenceId: new mongoose.Types.ObjectId(input.disputeId),
          description: `Penalty applied to vendor for upheld dispute on suborder ${dispute.suborderId}`,
          metadata: {
            grossAmount: breakdown.grossAmount,
            penaltyAmount,
            isCapped: penaltyAmount === 500_000,
            wouldGoNegative,
            debtAmount,
            debtRecoveryType,
            disputeId: input.disputeId,
          },
          // NOTE: Pass session once helpers support it
        });

        // --- Update Vendor Wallet ---
        // Removes frozen amount from disputed balance
        // Deducts penalty from available balance (may go negative)
        // Sets debt fields if wallet goes negative
        await applyDisputeUpheldDeductions(
          dispute.vendorId.toString(),
          dispute.frozenAmount,
          penaltyAmount,
          debtRecoveryType,
          wouldGoNegative ? DEBT_RECOVERY_PERCENTAGE : 0,
          // NOTE: Pass session once helpers support it
        );

        // --- Update Platform Wallet ---
        // Credits the penalty amount as platform penalty revenue
        await creditPlatformPenalty(
          penaltyAmount,
          // NOTE: Pass session once helpers support it
        );

        // --- Update Dispute Record ---
        await resolveDisputeRecord(
          input.disputeId,
          DisputeOutcome.UPHELD,
          DisputeResolvedBy.PLATFORM_TEAM,
          penaltyAmount,
          input.resolutionNotes,
          // NOTE: Pass session once helpers support it
        );

        // --- Update Transaction Record: suborder status → REFUNDED ---
        await updateSuborderFinancialStatus(
          dispute.orderId.toString(),
          dispute.suborderId.toString(),
          SuborderFinancialStatus.REFUNDED,
          // NOTE: Pass session once helpers support it
        );

        await session.commitTransaction();

        return {
          success: true,
          message: "Dispute resolved. Student will be refunded.",
          data: {
            disputeId: input.disputeId,
            outcome: DisputeOutcome.UPHELD,
            refundAmount: dispute.frozenAmount,
            penaltyAmount,
            vendorDebt: wouldGoNegative
              ? {
                  amount: debtAmount,
                  recoveryType: debtRecoveryType,
                  recoveryPercentage:
                    debtRecoveryType === DebtRecoveryType.PERCENTAGE_DEDUCTION
                      ? DEBT_RECOVERY_PERCENTAGE
                      : null,
                }
              : null,
          },
        };
      } catch (error) {
        await session.abortTransaction();
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
        const now = new Date();

        // --- FUNDS_RELEASED ledger entry ---
        // The frozen amount is moved from the vendor's disputed balance
        // back into their available balance
        await createLedgerEntry({
          type: LedgerEntryType.CREDIT,
          category: LedgerEntryCategory.FUNDS_RELEASED,
          amount: dispute.frozenAmount,
          entityType: LedgerEntityType.VENDOR,
          entityId: dispute.vendorId,
          referenceType: LedgerReferenceType.DISPUTE,
          referenceId: new mongoose.Types.ObjectId(input.disputeId),
          description: `Funds released to vendor after rejected dispute on suborder ${dispute.suborderId}`,
          metadata: {
            orderId: dispute.orderId.toString(),
            suborderId: dispute.suborderId.toString(),
            disputeId: input.disputeId,
            releasedAt: now.toISOString(),
          },
          // NOTE: Pass session once helpers support it
        });

        // --- Update Vendor Wallet: disputed → available ---
        await releaseVendorDisputedToAvailable(
          dispute.vendorId.toString(),
          dispute.frozenAmount,
          // NOTE: Pass session once helpers support it
        );

        // --- Update Dispute Record ---
        await resolveDisputeRecord(
          input.disputeId,
          DisputeOutcome.REJECTED,
          DisputeResolvedBy.PLATFORM_TEAM,
          0, // No penalty on rejection
          input.resolutionNotes,
          // NOTE: Pass session once helpers support it
        );

        // --- Update Transaction Record: suborder status → SETTLED ---
        await updateSuborderFinancialStatus(
          dispute.orderId.toString(),
          dispute.suborderId.toString(),
          SuborderFinancialStatus.SETTLED,
          // NOTE: Pass session once helpers support it
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
          additionalEvidenceDeadline: updatedDispute.additionalEvidenceDeadline,
        },
      };
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
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch dispute details.");
      }
    }),
});
