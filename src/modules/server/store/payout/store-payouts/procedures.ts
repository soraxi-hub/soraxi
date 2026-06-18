import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { TRPCError } from "@trpc/server";
import { PayoutStatus } from "@/enums/financial.enums";
import { MINIMUM_PAYOUT_AMOUNT_KOBO } from "@/constants/financial.constants";
import { koboToNaira } from "@/lib/utils/naira";
import { PayoutRepository } from "@/repositories/implementations/payout.repository";
import { PayoutService } from "@/services/implementations/payout.service";

const payoutRepository = new PayoutRepository();
export const payoutService = new PayoutService(payoutRepository);

export const vendorPayoutRouter = createTRPCRouter({
  /**
   * Store-facing: Create a new withdrawal request
   *
   * Validates the vendor's identity via store password, confirms
   * the selected bank account exists, checks wallet state, then
   * creates a PayoutRecord and debits the vendor wallet.
   *
   * The actual Flutterwave transfer is handled separately by the
   * payout background job which runs every 24 hours and picks up
   * all INITIATED payout records.
   */
  createWithdrawalRequest: baseProcedure
    .input(
      z.object({
        amount: z
          .number()
          .positive("Amount must be positive")
          .min(
            MINIMUM_PAYOUT_AMOUNT_KOBO,
            `Minimum withdrawal is ₦${koboToNaira(MINIMUM_PAYOUT_AMOUNT_KOBO).toLocaleString()}`,
          ),
        accountId: z.string().min(1, "Bank account is required"),
        storePassword: z.string().min(1, "Store password is required"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { store: storeToken } = ctx;

        if (!storeToken?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please login to your store.",
          });
        }

        const result = await payoutService.createPayoutRequest({
          storeId: storeToken.id,
          amount: input.amount,
          accountId: input.accountId,
          storePassword: input.storePassword,
        });

        return {
          success: true,
          message: result.message,
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to create withdrawal request.");
      }
    }),

  /**
   * Store-facing: Fetch paginated withdrawal history
   *
   * Returns all payout records for the authenticated store in reverse
   * chronological order. Filterable by status.
   */
  getWithdrawals: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z
          .enum([
            "all",
            PayoutStatus.INITIATED,
            PayoutStatus.PROCESSING,
            PayoutStatus.COMPLETED,
            PayoutStatus.FAILED,
          ])
          .default("all"),
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

        const history = await payoutService.getVendorPayoutHistory(
          storeToken.id,
          input.page,
          input.limit,
          input.status,
        );

        return {
          success: true,
          data: {
            withdrawals: history.payouts,
            pagination: {
              page: history.page,
              limit: history.limit,
              total: history.total,
              pages: Math.ceil(history.total / history.limit),
            },
          },
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch withdrawal history.");
      }
    }),

  /**
   * Store-facing: Fetch a single payout record by its ID.
   *
   * Validates the authenticated store owns the payout record,
   * then returns a clean, formatted response for the detail page.
   */
  getWithdrawalById: baseProcedure
    .input(
      z.object({
        payoutRecordId: z.string().min(1, "Payout record ID is required"),
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

        const payout = await payoutService.getPayoutById(input.payoutRecordId);

        if (!payout) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Payout record not found or does not belong to your store.",
          });
        }

        // Ensure the payout belongs to the authenticated store
        if (payout.vendorId !== storeToken.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to view this payout.",
          });
        }

        return {
          success: true,
          data: payout,
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch withdrawal details.");
      }
    }),
});
