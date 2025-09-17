import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import {
  getWalletModel,
  getWalletTransactionModel,
} from "@/lib/db/models/wallet.model";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/modules/admin/security/audit-logger";
import mongoose from "mongoose";
import type { Role } from "@/modules/admin/security/roles";
import { calculateCommission } from "@/lib/utils/calculate-commission";
import { currencyOperations, formatNaira } from "@/lib/utils/naira";
import { sendMail, wrapWithBrandedTemplate } from "@/services/mail.service";
import { siteConfig } from "@/config/site";
import type {
  EscrowReleaseInput,
  EscrowReleaseResponse,
  EscrowEligibilityCheck,
  WalletTransactionData,
  EscrowReleaseAuditDetails,
  PopulatedStoreForRelease,
  PopulatedUserForRelease,
} from "@/types/escrow-release-types";
import { DeliveryStatus } from "@/enums";

/**
 * Admin Escrow Release TRPC Router
 *
 * Handles the actual release of escrow funds to seller wallets.
 * This is a critical financial operation that requires careful validation
 * and atomic transaction processing to ensure data consistency and financial integrity.
 *
 * Business Logic Flow:
 * 1. Authenticate and authorize admin user
 * 2. Validate sub-order eligibility for escrow release
 * 3. Start atomic database transaction
 * 4. Update escrow status (released = true, held = false)
 * 5. Credit seller's wallet with the calculated settlement amount
 * 6. Create comprehensive wallet transaction record
 * 7. Send notification email to store owner
 * 8. Log detailed audit information
 * 9. Commit transaction or rollback on any failure
 *
 * Security Features:
 * - Admin authentication and authorization
 * - Atomic database transactions with automatic rollback
 * - Comprehensive validation and error handling
 * - Detailed audit logging for compliance
 * - Input sanitization and type validation
 *
 * Performance Considerations:
 * - Uses database sessions for transaction management
 * - Optimized queries with selective field population
 * - Efficient error handling to minimize resource usage
 */
export const adminEscrowReleaseRouter = createTRPCRouter({
  /**
   * POST Handler - Release Escrow Funds to Seller
   *
   * Processes the release of held escrow funds to the seller's wallet after
   * verifying all eligibility criteria are met. This operation is atomic
   * and will rollback completely if any step fails.
   */
  releaseEscrow: baseProcedure
    .input(
      z.object({
        /**
         * Sub-order ID validation
         *
         * Must be a non-empty string representing a valid MongoDB ObjectId.
         * This identifies the specific sub-order for escrow release.
         */
        subOrderId: z.string().min(1, "Sub-order ID is required"),

        /**
         * Optional admin notes
         *
         * Allows administrators to provide context or reasoning for the
         * escrow release, which will be included in audit logs.
         */
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }): Promise<EscrowReleaseResponse> => {
      const { admin } = ctx;
      let session: mongoose.ClientSession | null = null;

      try {
        // ==================== Authentication & Authorization ====================

        /**
         * Admin Authentication Check
         *
         * Verifies that the request is coming from an authenticated admin user
         * with appropriate permissions to release escrow funds. This is a critical
         * security check as escrow release involves financial transactions.
         */
        if (!admin || !checkAdminPermission(admin, [])) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin authentication required",
          });
        }

        // ==================== Input Validation ====================

        /**
         * Parse and Validate Input Data
         *
         * Extracts the sub-order ID and validates it's a proper MongoDB ObjectId.
         * This prevents invalid database queries and potential injection attacks.
         */
        const { subOrderId, notes }: EscrowReleaseInput = input;

        if (!mongoose.Types.ObjectId.isValid(subOrderId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide a valid sub-order ID",
          });
        }

        // ==================== Database Transaction Setup ====================

        /**
         * Start Database Session for Atomic Transaction
         *
         * All database operations must be atomic to ensure data consistency.
         * If any operation fails, all changes will be rolled back automatically.
         * This is crucial for financial operations to prevent partial updates.
         */
        session = await mongoose.startSession();
        session.startTransaction();

        // ==================== Get Database Models ====================

        /**
         * Initialize Database Models
         *
         * Gets the required Mongoose models for order, wallet, and transaction operations.
         * All operations will use the same session for transaction consistency.
         */
        const Order = await getOrderModel();
        const Wallet = await getWalletModel();
        const WalletTransaction = await getWalletTransactionModel();

        // ==================== Find and Validate Sub-Order ====================

        /**
         * Find Sub-Order with Complete Context
         *
         * Locates the specific sub-order and populates all related data needed
         * for the escrow release process, including user and store information.
         * Uses the transaction session to ensure data consistency.
         */
        const orderWithSubOrder = await Order.findOne({
          "subOrders._id": new mongoose.Types.ObjectId(subOrderId),
        })
          .populate({
            path: "user",
            select: "firstName lastName email",
          })
          .populate({
            path: "subOrders.store",
            select: "name storeEmail wallet",
          })
          .session(session);

        if (!orderWithSubOrder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order with specified sub-order not found",
          });
        }

        /**
         * Extract the specific sub-order from the order document
         *
         * Finds the exact sub-order within the order's subOrders array
         * that matches the provided subOrderId.
         */
        const subOrder = orderWithSubOrder.subOrders.find(
          (so) => so._id?.toString() === subOrderId
        );

        if (!subOrder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Sub-order not found",
          });
        }

        // ==================== Eligibility Validation ====================

        /**
         * Comprehensive Eligibility Check
         *
         * Verifies all conditions are met for escrow release using a structured
         * approach that tracks each validation step. This ensures complete
         * validation and provides detailed error messages.
         */
        const eligibilityCheck: EscrowEligibilityCheck = {
          isEligible: true,
          errors: [],
          checks: {
            escrowHeld: subOrder.escrow.held,
            notAlreadyReleased: !subOrder.escrow.released,
            deliveryConfirmed:
              subOrder.deliveryStatus === DeliveryStatus.Delivered,
            returnWindowPassed: new Date() > subOrder.returnWindow,
          },
        };

        // Validate each eligibility criterion
        if (!eligibilityCheck.checks.escrowHeld) {
          eligibilityCheck.errors.push("Escrow is not currently held");
        }

        if (!eligibilityCheck.checks.notAlreadyReleased) {
          eligibilityCheck.errors.push("Escrow has already been released");
        }

        if (!eligibilityCheck.checks.deliveryConfirmed) {
          eligibilityCheck.errors.push("Order has not been delivered");
        }

        if (!eligibilityCheck.checks.returnWindowPassed) {
          eligibilityCheck.errors.push("Return window has not yet passed");
        }

        // If any eligibility check fails, throw an error with all issues
        if (eligibilityCheck.errors.length > 0) {
          eligibilityCheck.isEligible = false;
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Sub-order is not eligible for escrow release: ${eligibilityCheck.errors.join(
              ", "
            )}`,
          });
        }

        // ==================== Get Seller Wallet ====================

        /**
         * Locate Seller's Wallet
         *
         * Finds the seller's wallet using the store reference from the sub-order.
         * The wallet must exist as it should have been created during store setup.
         */
        const sellerWallet = await Wallet.findOne({
          store: subOrder.store,
        }).session(session);

        if (!sellerWallet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Store wallet not found for store ID: ${subOrder.store}`,
          });
        }

        // ==================== Calculate Release Amount ====================

        /**
         * Calculate Escrow Release Amount
         *
         * Determines the exact amount to be released to the seller after
         * platform commission deduction. The settlement amount plus shipping
         * costs (if applicable) will be credited to the seller's wallet.
         */
        const commissionResult = calculateCommission(subOrder.totalAmount);

        const settlementDetails = {
          // Settlement after commission
          settleAmount: commissionResult.settleAmount,
          // Release amount = settlement + shipping fee (if any)
          releaseAmount: currencyOperations.add(
            commissionResult.settleAmount,
            subOrder.shippingMethod?.price ?? 0
          ),
          commission: commissionResult.commission,
          appliedPercentageFee: commissionResult.details.percentageFee,
          appliedFlatFee: commissionResult.details.flatFeeApplied,
        };

        // ==================== Update Settlement Information ====================

        /**
         * Update Settlement Details in Sub-Order
         *
         * Records the calculated settlement amount and shipping price
         * in the sub-order for future reference and reporting.
         */
        if (subOrder.settlement) {
          subOrder.settlement.amount = settlementDetails.settleAmount;

          subOrder.settlement.shippingPrice =
            subOrder.shippingMethod?.price ?? 0;

          subOrder.settlement.commission = settlementDetails.commission;

          subOrder.settlement.appliedPercentageFee =
            settlementDetails.appliedPercentageFee;

          subOrder.settlement.appliedFlatFee = settlementDetails.appliedFlatFee;

          subOrder.settlement.notes = `Escrow released for order ${(
            orderWithSubOrder._id as mongoose.Types.ObjectId
          )
            .toString()
            .substring(0, 8)
            .toUpperCase()}`;
        }

        // ==================== Update Escrow Status ====================

        /**
         * Update Sub-Order Escrow Status
         *
         * Marks the escrow as released and no longer held, with timestamp
         * for audit and reporting purposes.
         */
        subOrder.escrow.released = true;
        subOrder.escrow.held = false;
        subOrder.escrow.releasedAt = new Date();

        await orderWithSubOrder.save({ session });

        // ==================== Credit Seller Wallet ====================

        /**
         * Credit Seller's Wallet
         *
         * Adds the calculated release amount to the seller's available balance
         * and updates their total earnings for reporting and analytics.
         */
        sellerWallet.balance += settlementDetails.releaseAmount;
        sellerWallet.totalEarned += settlementDetails.releaseAmount;
        await sellerWallet.save({ session });

        // ==================== Create Wallet Transaction ====================

        /**
         * Record Wallet Transaction
         *
         * Creates a comprehensive transaction record for the escrow release,
         * linking it to the original order for complete audit trail.
         */
        const walletTransactionData: WalletTransactionData = {
          wallet: sellerWallet._id as unknown as mongoose.Schema.Types.ObjectId,
          type: "credit",
          amount: settlementDetails.releaseAmount,
          source: "order",
          description: `Escrow release for order ${(
            orderWithSubOrder._id as mongoose.Types.ObjectId
          )
            .toString()
            .substring(0, 8)
            .toUpperCase()}`,
          relatedDocumentId:
            orderWithSubOrder._id as unknown as mongoose.Schema.Types.ObjectId,
          relatedDocumentType: "Order",
        };

        const walletTransaction = new WalletTransaction(walletTransactionData);
        await walletTransaction.save({ session });

        // TODO: Add logic for updating platform's earnings for the month and total/overall earnings.

        // ==================== Send Notification Email ====================

        /**
         * Send Escrow Release Notification to Store
         *
         * Informs the store owner that their escrow funds have been released
         * and are now available in their wallet for withdrawal. Uses type-safe
         * access to populated store data.
         */
        const populatedStore =
          subOrder.store as unknown as PopulatedStoreForRelease;
        if (populatedStore?.storeEmail) {
          try {
            await sendMail({
              email: populatedStore.storeEmail,
              emailType: "noreply",
              fromAddress: "noreply@soraxihub.com",
              subject: `Escrow Released for Order ${(
                orderWithSubOrder._id as mongoose.Types.ObjectId
              )
                .toString()
                .substring(0, 8)
                .toUpperCase()}`,
              html: wrapWithBrandedTemplate({
                title: "Escrow Release Notification",
                bodyContent: `
                  <h2>Escrow Funds Released</h2>
                  <p>Your escrow funds for order <strong>SUB-${subOrder._id
                    ?.toString()
                    .substring(0, 8)
                    .toUpperCase()}</strong> have been released.</p>
                  <p><strong>Amount Released:</strong> ${formatNaira(
                    settlementDetails.releaseAmount
                  )}</p>
                  <p><strong>New Wallet Balance:</strong> ${formatNaira(
                    sellerWallet.balance
                  )}</p>
                  <p>The funds are now available in your wallet for withdrawal.</p>
                  <p>Transaction ID: ${walletTransaction._id
                    .toString()
                    .substring(0, 8)
                    .toUpperCase()}</p>
                  <p>Thank you for selling with ${siteConfig.name}!</p>
                `,
              }),
            });
          } catch (emailError) {
            // Log email error but don't fail the transaction
            console.error(
              "Failed to send escrow release notification email:",
              emailError
            );
          }
        }

        // ==================== Commit Transaction ====================

        /**
         * Commit All Changes
         *
         * If we reach this point, all operations were successful.
         * Commit the transaction to make all changes permanent.
         */
        await session.commitTransaction();

        // ==================== Prepare Response Data ====================

        /**
         * Format Response Data with Type Safety
         *
         * Prepares comprehensive response data for the admin interface
         * with proper TypeScript typing throughout.
         */
        const populatedUser =
          orderWithSubOrder.user as unknown as PopulatedUserForRelease;

        const responseData: EscrowReleaseResponse = {
          success: true,
          message: "Escrow funds released successfully",
          release: {
            subOrderId: subOrder._id?.toString() || "",
            orderId: (
              orderWithSubOrder._id as mongoose.Types.ObjectId
            ).toString(),
            orderNumber: `ORD-${(
              orderWithSubOrder._id as mongoose.Types.ObjectId
            )
              .toString()
              .substring(0, 8)
              .toUpperCase()}`,
            subOrderNumber: `SUB-${subOrder._id
              ?.toString()
              .substring(0, 8)
              .toUpperCase()}`,
            amount: settlementDetails.releaseAmount,
            currency: "NGN",
            releasedAt:
              subOrder.escrow.releasedAt?.toISOString() ||
              new Date().toISOString(),
            seller: {
              id: populatedStore._id?.toString() || "",
              name: populatedStore.name || "Unknown Store",
              email: populatedStore.storeEmail || "",
            },
            customer: {
              name: populatedUser
                ? `${populatedUser.firstName} ${populatedUser.lastName}`
                : "Unknown Customer",
              email: populatedUser?.email || "N/A",
            },
            walletTransaction: {
              id: walletTransaction._id.toString(),
              newBalance: sellerWallet.balance,
            },
          },
        };

        // ==================== Audit Logging ====================

        /**
         * Log Admin Action with Comprehensive Details
         *
         * Records the escrow release action for audit purposes with all
         * relevant information for compliance and monitoring.
         */
        const auditDetails: EscrowReleaseAuditDetails = {
          action: "escrow_release",
          subOrderId,
          orderId: (
            orderWithSubOrder._id as mongoose.Types.ObjectId
          ).toString(),
          amount: settlementDetails.releaseAmount,
          sellerId: populatedStore._id?.toString() || "",
          sellerName: populatedStore.name || "Unknown Store",
          customerEmail: populatedUser?.email || "N/A",
          notes: notes || null,
          walletTransactionId: walletTransaction._id.toString(),
          newWalletBalance: sellerWallet.balance,
        };

        await logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles as Role[],
          action: AUDIT_ACTIONS.REFUND_APPROVED, // Using closest available action
          module: AUDIT_MODULES.FINANCE,
          details: auditDetails,
        });

        // ==================== Return Response ====================

        return responseData;
      } catch (error) {
        // ==================== Error Handling & Rollback ====================

        /**
         * Rollback Transaction on Error
         *
         * If any error occurs, rollback all database changes to maintain consistency.
         * This ensures that partial updates never occur in the database.
         */
        if (session) {
          await session.abortTransaction();
        }

        console.error("Escrow release error:", error);

        // Handle specific error types with appropriate HTTP status codes
        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof mongoose.Error.ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid data provided for escrow release",
          });
        }

        if (error instanceof mongoose.Error.CastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid ID format provided",
          });
        }

        // Handle generic errors
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }

        // Fallback for unknown errors
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to release escrow funds. Please try again later.",
        });
      } finally {
        // ==================== Cleanup ====================

        /**
         * End Database Session
         *
         * Always end the session to free up resources, regardless of
         * whether the transaction was committed or aborted.
         */
        if (session) {
          await session.endSession();
        }
      }
    }),
});
