import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getRefundRecordModel } from "@/lib/db/models/refund-record.model";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { AdminGuard } from "@/domain/admin/admin-guard";
import { RefundStatus, RefundTrigger } from "@/enums/financial.enums";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getUserModel } from "@/lib/db/models/user.model";
import { RefundService } from "@/services/refund.service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-readable label for each refund trigger. */
function formatTriggerLabel(trigger: RefundTrigger): string {
  switch (trigger) {
    case RefundTrigger.ORDER_CANCELLED:
      return "Order Cancelled";
    case RefundTrigger.FAILED_DELIVERY:
      return "Failed Delivery";
    case RefundTrigger.DISPUTE_UPHELD:
      return "Dispute Upheld";
    default:
      return trigger;
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const adminRefundRouter = createTRPCRouter({
  /**
   * Admin: Get paginated list of all refund records.
   * Requires VIEW_REFUNDS permission.
   */
  getAdminRefunds: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z
          .enum(["all", ...Object.values(RefundStatus)] as const)
          .default("all"),
        trigger: z
          .enum(["all", ...Object.values(RefundTrigger)] as const)
          .default("all"),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;

      // ==================== Authentication & Authorization ====================
      AdminGuard.from(unAuthenticatedAdmin).require(PERMISSIONS.VIEW_REFUNDS);

      try {
        await connectToDatabase();
        const RefundRecord = await getRefundRecordModel();

        const filter: Record<string, any> = {};
        if (input.status !== "all") filter.status = input.status;
        if (input.trigger !== "all") filter.trigger = input.trigger;

        const skip = (input.page - 1) * input.limit;

        const [refunds, total] = await Promise.all([
          RefundRecord.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(input.limit)
            .lean(),
          RefundRecord.countDocuments(filter),
        ]);

        // Summary counts by status
        const [totalInitiated, totalCompleted, totalFailed] = await Promise.all(
          [
            RefundRecord.countDocuments({ status: RefundStatus.INITIATED }),
            RefundRecord.countDocuments({ status: RefundStatus.COMPLETED }),
            RefundRecord.countDocuments({ status: RefundStatus.FAILED }),
          ],
        );

        // Enrich with vendor and customer names
        const Store = await getStoreModel();
        const User = await getUserModel();

        const enrichedRefunds = await Promise.all(
          refunds.map(async (refund) => {
            const [store, customer] = await Promise.all([
              Store.findById(refund.vendorId).select("name").lean(),
              User.findById(refund.customerId)
                .select("firstName lastName")
                .lean(),
            ]);

            return {
              refundId: refund._id.toString(),
              suborderId: refund.suborderId.toString(),
              orderId: refund.orderId.toString(),
              trigger: refund.trigger,
              triggerLabel: formatTriggerLabel(refund.trigger),
              amountBreakdown: {
                amountRefunded: refund.amountBreakdown.amountRefunded,
                settleAmount: refund.amountBreakdown.settleAmount,
                commission: refund.amountBreakdown.commission,
              },
              status: refund.status,
              vendor: store ? { name: store.name } : null,
              customer: customer
                ? {
                    name: `${customer.firstName} ${customer.lastName}`.trim(),
                  }
                : null,
              flutterwaveTransactionId: refund.flutterwaveTransactionId,
              flutterwaveRefundId: refund.flutterwaveRefundId ?? null,
              failureReason: refund.failureReason ?? null,
              createdAt: refund.createdAt,
              updatedAt: refund.updatedAt,
            };
          }),
        );

        return {
          success: true,
          data: {
            refunds: enrichedRefunds,
            pagination: {
              page: input.page,
              limit: input.limit,
              total,
              pages: Math.ceil(total / input.limit),
            },
            summary: {
              totalInitiated,
              totalCompleted,
              totalFailed,
            },
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch refund records.");
      }
    }),

  /**
   * Admin: Get a single refund record by ID.
   * Requires VIEW_REFUNDS permission.
   */
  getAdminRefundById: baseProcedure
    .input(
      z.object({
        refundId: z.string().min(1),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;

      // ==================== Authentication & Authorization ====================
      AdminGuard.from(unAuthenticatedAdmin).require(PERMISSIONS.VIEW_REFUNDS);

      try {
        await connectToDatabase();
        const RefundRecord = await getRefundRecordModel();

        const refund = await RefundRecord.findById(
          new mongoose.Types.ObjectId(input.refundId),
        ).lean();

        if (!refund) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Refund record not found.",
          });
        }

        // Enrich with vendor and customer details
        const Store = await getStoreModel();
        const User = await getUserModel();

        const [store, customer] = await Promise.all([
          Store.findById(refund.vendorId).select("name storeEmail").lean(),
          User.findById(refund.customerId)
            .select("firstName lastName email phoneNumber")
            .lean(),
        ]);

        return {
          success: true,
          data: {
            refundId: refund._id.toString(),
            suborderId: refund.suborderId.toString(),
            orderId: refund.orderId.toString(),
            trigger: refund.trigger,
            triggerLabel: formatTriggerLabel(refund.trigger),
            amountBreakdown: {
              amountRefunded: refund.amountBreakdown.amountRefunded,
              settleAmount: refund.amountBreakdown.settleAmount,
              commission: refund.amountBreakdown.commission,
            },
            status: refund.status,
            vendor: store
              ? { name: store.name, email: store.storeEmail }
              : null,
            customer: customer
              ? {
                  name: `${customer.firstName} ${customer.lastName}`.trim(),
                  email: customer.email,
                  phoneNumber: customer.phoneNumber,
                }
              : null,
            flutterwaveTransactionId: refund.flutterwaveTransactionId,
            flutterwaveRefundId: refund.flutterwaveRefundId ?? null,
            manualReference: refund.manualReference ?? null,
            failureReason: refund.failureReason ?? null,
            createdAt: refund.createdAt,
            updatedAt: refund.updatedAt,
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch refund details.");
      }
    }),

  /**
   * Admin: Confirm or fail a refund that was executed manually via the
   * Flutterwave dashboard.
   *
   * This procedure owns only auth, input validation, and status guarding.
   * All financial logic is delegated to RefundService.confirmManualRefund.
   *
   * - action "complete": writes writeRefundConfirmed, marks COMPLETED,
   *   notifies customer.
   * - action "fail": marks FAILED with a reason. The CUSTOMER_REFUND_PAYABLE
   *   liability stays open — a follow-up manual action will be needed.
   *
   * Only INITIATED refunds are actionable.
   * Requires MANAGE_REFUNDS permission.
   */
  confirmManualRefund: baseProcedure
    .input(
      z.object({
        refundId: z.string().min(1),
        action: z.enum(["complete", "fail"]),
        /**
         * Flutterwave refund ID copied from the Flutterwave dashboard after
         * the admin executes the refund manually. Required for "complete".
         */
        flutterwaveRefundId: z.string().optional(),
        /**
         * Human-readable reason. Required when action is "fail".
         */
        failureReason: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;

      // ==================== Authentication & Authorization ====================
      AdminGuard.from(unAuthenticatedAdmin).require(PERMISSIONS.MANAGE_REFUNDS);

      // ==================== Input validation ====================
      if (input.action === "complete" && !input.flutterwaveRefundId?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A Flutterwave refund ID is required to confirm a refund.",
        });
      }

      if (input.action === "fail" && !input.failureReason?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "A failure reason is required when marking a refund as failed.",
        });
      }

      try {
        await connectToDatabase();
        const RefundRecord = await getRefundRecordModel();

        const refund = await RefundRecord.findById(
          new mongoose.Types.ObjectId(input.refundId),
        );

        if (!refund) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Refund record not found.",
          });
        }

        // ==================== Status guard ====================
        if (refund.status !== RefundStatus.INITIATED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `This refund is already in a terminal state (${refund.status}) and cannot be updated.`,
          });
        }

        // ==================== Delegate to service ====================
        if (input.action === "complete") {
          const result = await RefundService.confirmManualRefund({
            refundRecord: refund,
            flutterwaveRefundId: input.flutterwaveRefundId!.trim(),
          });
          return { success: true, message: result.message };
        }

        // Fail path — mark FAILED, leave liability open for follow-up
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          await RefundRecord.findByIdAndUpdate(
            refund._id,
            {
              $set: {
                status: RefundStatus.FAILED,
                failureReason: input.failureReason!.trim(),
              },
            },
            { session },
          );
          await session.commitTransaction();
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }

        return {
          success: true,
          message:
            "Refund marked as failed. The refund liability remains open — a follow-up action will be required.",
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to process manual refund action.");
      }
    }),
});
