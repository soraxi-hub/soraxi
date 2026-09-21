import mongoose from "mongoose";
import { AppError } from "@/lib/errors/app-error";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  getTransactionRecordModel,
  type ITransactionRecord,
  type ITransactionRecordDocument,
} from "@/lib/db/models/transaction-record.model";
import { OrderRepository } from "@/repositories/order.repository";
import { DisputeRepository } from "@/repositories/dispute-record.repository";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { DisputeFactory } from "@/domain/disputes/dispute-factory";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import { RefundService } from "@/services/refund.service";
import {
  applyDisputeUpheldDeductions,
  releaseVendorDisputedToAvailable,
} from "@/lib/db/models/vendor-wallet.model";
import {
  creditPlatformPenalty,
  debitPlatformCommission,
} from "@/lib/db/models/platform-wallet.model";
import { calculatePenalty } from "@/lib/utils/calculate-penalty.util";
import {
  DebtRecoveryType,
  DisputeStatus,
  DisputeOutcome,
  DisputeResolvedBy,
  RefundTrigger,
  SuborderFinancialStatus,
} from "@/enums/financial.enums";
import { DeliveryStatus } from "@/enums";
import { DateFormatter } from "@/lib/utils/date-formatter";
import {
  DISPUTE_RESOLUTION_BUSINESS_DAYS,
  DISPUTE_WINDOW_HOURS_AFTER_DELIVERY,
} from "@/constants/financial.constants";
import { freezeVendorFunds } from "@/lib/db/models/vendor-wallet.model";

export class DisputeService {
  static async openDispute(input: {
    orderId: string;
    suborderId: string;
    customerId: string;
    reason: string;
    evidence: string[];
  }) {
    await connectToDatabase();
    const order = await OrderRepository.getOrderById(input.orderId, true);

    if (!order || order.userId.toString() !== input.customerId) {
      throw new AppError(
        "NOT_FOUND",
        "We couldn't find that order on your account.",
      );
    }

    const suborder = order.subOrders.find(
      (item) => item._id.toString() === input.suborderId,
    );

    if (!suborder)
      throw new AppError("NOT_FOUND", "Suborder not found within this order.");

    if (
      suborder.deliveryStatus !== DeliveryStatus.Delivered ||
      !suborder.deliveryDate
    ) {
      throw new AppError(
        "BAD_REQUEST",
        "A dispute can only be raised for suborders that are delivered.",
      );
    }

    if (
      (Date.now() - suborder.deliveryDate.getTime()) / 3_600_000 >
      DISPUTE_WINDOW_HOURS_AFTER_DELIVERY
    ) {
      throw new AppError(
        "BAD_REQUEST",
        "The window to dispute this order has closed.",
      );
    }

    const transaction = await this.getTransaction(input.orderId);

    if (!transaction)
      throw new AppError(
        "NOT_FOUND",
        "Transaction record not found for this order.",
      );

    const breakdown = transaction.suborderBreakdowns.find(
      (item) => item.suborderId.toString() === input.suborderId,
    );

    if (!breakdown)
      throw new AppError(
        "NOT_FOUND",
        "No financial breakdown found for this suborder.",
      );

    if (
      ![
        SuborderFinancialStatus.PENDING,
        SuborderFinancialStatus.SETTLED,
      ].includes(breakdown.status)
    ) {
      throw new AppError(
        "BAD_REQUEST",
        "This suborder cannot be disputed in its current state.",
      );
    }

    if (await DisputeRepository.findActiveBySuborderId(input.suborderId)) {
      throw new AppError(
        "CONFLICT",
        "A dispute is already open for this suborder.",
      );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      const disputeId = new mongoose.Types.ObjectId();

      const dispute = await DisputeRepository.create(
        {
          _id: disputeId,
          suborderId: new mongoose.Types.ObjectId(input.suborderId),
          orderId: new mongoose.Types.ObjectId(input.orderId),
          customerId: new mongoose.Types.ObjectId(input.customerId),
          vendorId: breakdown.vendorId,
          reason: input.reason.trim(),
          evidence: input.evidence,
          status: DisputeStatus.OPEN,
          frozenAmount: breakdown.settleAmount,
          penaltyAmount: 0,
          openedAt: now,
          deadline: DateFormatter.addBusinessDays(
            now,
            DISPUTE_RESOLUTION_BUSINESS_DAYS,
            [0, 6],
          ),
        },
        session,
      );

      const writer = await JournalEntryWriter.init();

      await writer.writeDisputeOpened({
        vendorId: breakdown.vendorId,
        settleAmount: breakdown.settleAmount,
        disputeId,
        session,
      });

      await this.setSuborderStatus(
        input.orderId,
        input.suborderId,
        SuborderFinancialStatus.DISPUTED,
        session,
      );

      await freezeVendorFunds(
        breakdown.vendorId.toString(),
        breakdown.settleAmount,
        session,
      );

      await session.commitTransaction();
      return dispute;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Resolves an active dispute in the customer's favour. The financial
   * liability and the manual-refund work item are written atomically.
   */
  static async upholdDispute(input: {
    disputeId: string;
    resolutionNotes?: string;
    resolvedBy?: DisputeResolvedBy;
  }) {
    await connectToDatabase();
    const dispute = await DisputeRepository.findById(input.disputeId);

    if (!dispute)
      throw new AppError("NOT_FOUND", `Dispute ${input.disputeId} not found.`);

    const domain = DisputeFactory.create(dispute);
    domain.assertResolvable();

    const transaction = await this.getTransaction(dispute.orderId.toString());

    if (!transaction) {
      throw new AppError(
        "NOT_FOUND",
        `Transaction record not found for order ${dispute.orderId}.`,
      );
    }

    const breakdown = transaction.suborderBreakdowns.find(
      (item) => item.suborderId.toString() === dispute.suborderId.toString(),
    );

    if (!breakdown) {
      throw new AppError(
        "NOT_FOUND",
        `No financial breakdown found for suborder ${dispute.suborderId}.`,
      );
    }

    if (breakdown.status !== SuborderFinancialStatus.DISPUTED) {
      throw new AppError(
        "BAD_REQUEST",
        `Suborder is not in DISPUTED status. Current status: ${breakdown.status}.`,
      );
    }

    const order = await OrderRepository.getOrderById(
      dispute.orderId.toString(),
      true,
    );

    if (!order)
      throw new AppError("NOT_FOUND", `Order ${dispute.orderId} not found.`);

    const resolvedBy = input.resolvedBy ?? DisputeResolvedBy.PLATFORM_TEAM;
    const penaltyAmount =
      resolvedBy === DisputeResolvedBy.SYSTEM
        ? 0
        : calculatePenalty(breakdown.grossAmount).penaltyAmount;

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

      if (!deduction)
        throw new AppError(
          "NOT_FOUND",
          "Vendor wallet not found during deduction.",
        );

      const writer = await JournalEntryWriter.init();

      if (resolvedBy === DisputeResolvedBy.SYSTEM) {
        await writer.writeDisputeAutoResolved({
          vendorId: dispute.vendorId,
          customerId: dispute.customerId,
          settleAmount: dispute.frozenAmount,
          commission: breakdown.commission,
          disputeId: dispute._id as mongoose.Types.ObjectId,
          session,
        });
      } else {
        // --- DISPUTE_UPHELD journal entry ---
        // Penalty debit splits: penaltyFromAvailable out of VENDOR_AVAILABLE,
        // remainder into VENDOR_DEBT_RECEIVABLE. Full penalty is still
        // recognised as PLATFORM_REVENUE_PENALTIES revenue.
        await writer.writeDisputeUpheld({
          vendorId: dispute.vendorId,
          customerId: dispute.customerId,
          settleAmount: dispute.frozenAmount,
          commission: breakdown.commission,
          penaltyAmount,
          penaltyFromAvailable: deduction.penaltyFromAvailable,
          disputeId: dispute._id as mongoose.Types.ObjectId,
          session,
        });
        // --- Update Platform Wallet cache ---
        // Full penalty recognised as revenue regardless of the available/debt split.
        await creditPlatformPenalty(penaltyAmount, session);
      }
      // --- Update Platform Wallet cache ---
      // Commission reversed (customer refunded full amountPaid).
      await debitPlatformCommission(breakdown.commission, session);

      const resolved = await DisputeRepository.resolve(
        input.disputeId,
        {
          outcome: DisputeOutcome.UPHELD,
          resolvedBy,
          penaltyAmount,
          resolutionNotes: input.resolutionNotes,
        },
        session,
      );
      if (!resolved)
        throw new AppError(
          "CONFLICT",
          "Dispute was resolved by another process.",
        );

      await this.setSuborderStatus(
        dispute.orderId.toString(),
        dispute.suborderId.toString(),
        SuborderFinancialStatus.REFUNDED,
        session,
      );

      // The dispute entry already opened CUSTOMER_REFUND_PAYABLE. This record
      // is the operational/manual-provider work item and must commit with it.
      const refundRecord = await RefundService.initiateDisputeRefund({
        suborderId: dispute.suborderId.toString(),
        orderId: dispute.orderId.toString(),
        orderIdempotencyKey: order.idempotencyKey,
        vendorId: dispute.vendorId.toString(),
        customerId: dispute.customerId.toString(),
        settleAmount: dispute.frozenAmount,
        commission: breakdown.commission,
        paymentProvider: transaction.paymentProvider,
        gatewayTransactionId: transaction.gatewayTransactionId,
        disputeId: input.disputeId,
        trigger:
          resolvedBy === DisputeResolvedBy.SYSTEM
            ? RefundTrigger.DISPUTE_AUTO_RESOLVED
            : RefundTrigger.DISPUTE_UPHELD,
        session,
      });

      await session.commitTransaction();
      const penaltyToDebt = penaltyAmount - deduction.penaltyFromAvailable;

      return {
        dispute: resolved,
        refundRecord,
        refundAmount: dispute.frozenAmount + breakdown.commission,
        penaltyAmount,
        penaltyToDebt,
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async rejectDispute(input: {
    disputeId: string;
    resolutionNotes?: string;
    resolvedBy?: DisputeResolvedBy;
  }) {
    await connectToDatabase();
    const rawDispute = await DisputeRepository.findById(input.disputeId);

    if (!rawDispute)
      throw new AppError("NOT_FOUND", `Dispute ${input.disputeId} not found.`);

    const dispute = DisputeFactory.create(rawDispute);
    dispute.assertResolvable();

    const transaction = await this.getTransaction(dispute.orderId);

    const breakdown = transaction?.suborderBreakdowns.find(
      (item) => item.suborderId.toString() === dispute.suborderId,
    );

    if (!breakdown)
      throw new AppError(
        "NOT_FOUND",
        "No financial breakdown found for this suborder.",
      );

    if (breakdown.status !== SuborderFinancialStatus.DISPUTED)
      throw new AppError(
        "BAD_REQUEST",
        `Suborder is not in DISPUTED status. Current status: ${breakdown.status}.`,
      );

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
        vendorId: new mongoose.Types.ObjectId(dispute.vendorId),
        settleAmount: dispute.frozenAmount,
        disputeId: new mongoose.Types.ObjectId(dispute.disputeId),
        session,
      });

      // --- Update Vendor Wallet cache: disputed → available ---
      await releaseVendorDisputedToAvailable(
        dispute.vendorId,
        dispute.frozenAmount,
        session,
      );

      const resolved = await DisputeRepository.resolve(
        input.disputeId,
        {
          outcome: DisputeOutcome.REJECTED,
          resolvedBy: input.resolvedBy ?? DisputeResolvedBy.PLATFORM_TEAM,
          penaltyAmount: 0,
          resolutionNotes: input.resolutionNotes,
        },
        session,
      );

      if (!resolved)
        throw new AppError(
          "CONFLICT",
          "Dispute was resolved by another process.",
        );

      // --- Update Transaction Record: suborder status → SETTLED ---
      await this.setSuborderStatus(
        dispute.orderId.toString(),
        dispute.suborderId.toString(),
        SuborderFinancialStatus.SETTLED,
        session,
      );
      await session.commitTransaction();
      return { dispute: resolved, releasedAmount: dispute.frozenAmount };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async markInconclusive(input: { disputeId: string }) {
    await connectToDatabase();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const rawDispute = await DisputeRepository.findById(
        input.disputeId,
        session,
      );

      if (!rawDispute)
        throw new AppError(
          "NOT_FOUND",
          `Dispute ${input.disputeId} not found.`,
        );

      const dispute = DisputeFactory.create(rawDispute);

      dispute.assertCanRequestEvidence();
      dispute.requestAdditionalEvidence();

      const updated = await DisputeRepository.save(dispute, session);

      if (!updated)
        throw new AppError(
          "CONFLICT",
          "Dispute state changed before evidence could be requested.",
        );

      await session.commitTransaction();

      // ----------------------------------------------------------------
      // Notify student to submit additional evidence
      // NOTE: Include the 48-hour deadline (updated.additionalEvidenceDeadline)
      // and the route/link to submit evidence.
      // ----------------------------------------------------------------

      return updated;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async submitAdditionalEvidence(
    input: {
      disputeId: string;
      customerId: string;
      evidence: string[];
    },
    session?: mongoose.ClientSession,
  ) {
    const rawDispute = await DisputeRepository.findById(
      input.disputeId,
      session,
    );

    if (!rawDispute)
      throw new AppError("NOT_FOUND", "We couldn't find that dispute.");

    if (rawDispute.customerId.toString() !== input.customerId)
      throw new AppError(
        "FORBIDDEN",
        "You are not authorised to submit evidence for this dispute.",
      );

    const dispute = DisputeFactory.create(rawDispute);

    dispute.submitAdditionalEvidence(input.evidence);

    const updated = await DisputeRepository.save(dispute, session);

    if (!updated)
      throw new AppError(
        "CONFLICT",
        "Dispute state changed before evidence could be submitted.",
      );

    return updated;
  }

  static async getTransaction(
    orderId: string,
  ): Promise<ITransactionRecord | null> {
    const Model = await getTransactionRecordModel();
    return QueryBuilderFactory.queryBuilder<
      ITransactionRecord,
      ITransactionRecordDocument
    >(Model)
      .where("orderId", new mongoose.Types.ObjectId(orderId))
      .executeOne();
  }

  private static async setSuborderStatus(
    orderId: string,
    suborderId: string,
    status: SuborderFinancialStatus,
    session: mongoose.ClientSession,
  ): Promise<void> {
    const Model = await getTransactionRecordModel();
    const updated = await Model.findOneAndUpdate(
      {
        orderId: new mongoose.Types.ObjectId(orderId),
        "suborderBreakdowns.suborderId": new mongoose.Types.ObjectId(
          suborderId,
        ),
      },
      { $set: { "suborderBreakdowns.$.status": status } },
      { session, new: true },
    );
    if (!updated)
      throw new AppError("NOT_FOUND", "Suborder financial record not found.");
  }
}
