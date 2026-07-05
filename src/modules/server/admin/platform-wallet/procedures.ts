import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { PlatformWalletService } from "@/services/implementations/platform-wallet.service";
import { PlatformWalletRepository } from "@/repositories/implementations/platform-wallet.repository";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { AdminGuard } from "@/domain/admin/admin-guard";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

// Instantiate the repository and service (dependency injection)
const platformWalletRepository = new PlatformWalletRepository();
const platformWalletService = new PlatformWalletService(
  platformWalletRepository,
);

/**
 * tRPC router for platform wallet operations.
 * All procedures are protected (require authentication + admin permissions).
 */
export const platformWalletRouter = createTRPCRouter({
  /**
   * Retrieves the current platform wallet overview.
   * Includes total revenue, commission, penalties, currency, and last updated timestamp.
   *
   * @returns {Promise<{
   *   id: string;
   *   balances: { commission: number; penalties: number; total: number };
   *   currency: string;
   *   createdAt: Date;
   *   updatedAt: Date;
   * }>}
   */
  getOverview: baseProcedure.query(async ({ ctx }) => {
    try {
      const { admin: unAuthenticatedAdmin } = ctx;

      // ==================== Authentication & Authorization ====================
      // Admin Authentication Check
      AdminGuard.from(unAuthenticatedAdmin).require(
        PERMISSIONS.VIEW_PLATFORM_WALLET,
      );

      // Call service layer – no direct database access
      const wallet = await platformWalletService.getWallet();
      return wallet;
    } catch (error) {
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, {
              source: "trpc:admin.platform-wallet.getOverview",
            }),
          );
        } catch {
          // sendTelegramMessage already console.errors internally; never mask the original error
        }
      }
      throw handleTRPCError(error);
    }
  }),
});
