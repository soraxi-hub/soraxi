import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { VendorWalletService } from "@/services/vendor-wallet/vendor-wallet.service";
import { AppError } from "@/lib/errors/app-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

/**
 * Store Wallet Router
 *
 * Handles wallet retrieval for authenticated stores.
 *
 * Responsibilities:
 * - Validate store session
 * - Delegate wallet retrieval to the application service
 * - Transform application errors into TRPC errors
 *
 * Business logic lives inside VendorWalletService.
 */
export const storeWalletRouter = createTRPCRouter({
  /**
   * Retrieve the authenticated store's wallet.
   */
  getWallet: baseProcedure.query(async ({ ctx }) => {
    const { store } = ctx;

    try {
      // Ensure a store session exists
      if (!store?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store session required",
        });
      }

      const wallet = await VendorWalletService.getVendorWalletData(store.id);

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, {
              source: "trpc:store.wallet-management.fetch-wallet.getWallet",
            }),
          );
        } catch {
          // sendTelegramMessage already console.errors internally; never mask the original error
        }
      }

      // Convert application errors into TRPC errors
      if (error instanceof AppError) {
        throw new TRPCError({
          code: error.code,
          message: error.message,
        });
      }

      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Failed to retrieve vendor wallet:", error);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch wallet data",
      });
    }
  }),
});
