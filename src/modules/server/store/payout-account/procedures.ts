import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

import { TRPCError } from "@trpc/server";
import { getStoreModel } from "@/lib/db/models/store.model";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

// Define a single Bank type
export type Bank = {
  id: number;
  code: string;
  name: string;
};

export const paymentRouter = createTRPCRouter({
  getStorePayoutAccounts: baseProcedure.query(async ({ ctx }) => {
    try {
      const { store: storeToken } = ctx;

      if (!storeToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Please login to your store.`,
        });
      }
      const Store = await getStoreModel();

      const store = await Store.findById(storeToken.id)
        .select("payoutAccounts")
        .lean();

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Store not found for ${storeToken.id}.`,
        });
      }

      const payoutAccounts = store.payoutAccounts || [];

      const formattedPayoutAccounts = payoutAccounts.map((acc) => {
        if (!acc._id) {
          throw new Error(
            "[paymentRouter @ getStorePayoutAccounts]: PayoutAccount schema ID is required",
          );
        }
        return {
          id: acc._id.toString(),
          payoutMethod: acc.payoutMethod,
          bankDetails: {
            bankName: acc.bankDetails.bankName,
            accountNumber: acc.bankDetails.accountNumber,
            accountHolderName: acc.bankDetails.accountHolderName,
            bankCode: acc.bankDetails.bankCode,
            bankId: acc.bankDetails.bankId,
          },
        };
      });

      return formattedPayoutAccounts;
    } catch (error) {
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, {
              source: "trpc:store.payout-account.getStorePayoutAccounts",
            }),
          );
        } catch {
          // sendTelegramMessage already console.errors internally; never mask the original error
        }
      }
      throw handleTRPCError(
        error,
        "We couldn't load your store's payout accounts. Please try again.",
      );
    }
  }),

  getBanks: baseProcedure.query(async () => {
    try {
      if (!process.env.FLUTTERWAVE_SECRET_KEY) {
        console.error("Missing required environment variables");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Server configuration error: Missing required PAYSTACK environment variables",
        });
      }

      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      };

      const response = await fetch(
        "https://api.flutterwave.com/v3/banks/NG",
        options,
      );

      const banks = (await response.json()) as {
        status: true;
        message: string;
        data: Bank[];
      };

      const formattedBanks = banks.data.map((bank) => {
        return {
          id: bank.id,
          code: bank.code,
          name: bank.name,
        };
      });

      return formattedBanks;
    } catch (error) {
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, {
              source: "trpc:store.payout-account.getBanks",
            }),
          );
        } catch {
          // sendTelegramMessage already console.errors internally; never mask the original error
        }
      }
      throw handleTRPCError(
        error,
        "We couldn't load the bank list. Please try again.",
      );
    }
  }),

  resolveAccountNumber: baseProcedure
    .input(z.object({ accountNumber: z.string(), bankCode: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const { accountNumber, bankCode } = input;

        if (
          !process.env.FLUTTERWAVE_SECRET_KEY_LIVE_FOR_BANK_ACCOUNT_VERIFICATION
        ) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Server configuration error: Missing required FLUTTERWAVE environment variables",
          });
        }

        const options = {
          method: "POST",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY_LIVE_FOR_BANK_ACCOUNT_VERIFICATION}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account_number: accountNumber.toString(),
            account_bank: bankCode.toString(),
          }),
        };

        const response = await fetch(
          "https://api.flutterwave.com/v3/accounts/resolve",
          options,
        );

        const result = (await response.json()) as {
          status: string;
          message: string;
          data: {
            account_number: string;
            account_name: string;
          };
        };

        /**
         * Distinguish "we could not verify this account" from "verification is
         * broken".
         *
         * The response body was previously returned whatever the HTTP status,
         * so a 5xx from Flutterwave surfaced to the vendor as an ordinary
         * result reading "An error occurred. Please contact support" — which
         * reads like *their* account is wrong, sends them to support, and
         * leaves no trace for us. Two very different problems wearing the same
         * message.
         *
         * A non-2xx is our problem, not theirs: it is reported through the
         * normal error path (and so to Telegram) and the vendor is told the
         * truth — the check is unavailable, not that their details are bad.
         *
         * The account number is deliberately NOT logged. It is the vendor's
         * banking detail and has no place in application logs.
         */
        if (!response.ok) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Bank verification is temporarily unavailable. Please try again shortly. (provider responded ${response.status})`,
            cause: new Error(
              `Flutterwave /accounts/resolve returned ${response.status}: ${result?.message ?? "no message"} (bank code ${bankCode})`,
            ),
          });
        }

        return result;
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:store.payout-account.resolveAccountNumber",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't verify that account number with the bank. Please try again.",
        );
      }
    }),

  /**
   * Sets the store's single payout account, replacing whatever was there.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * WHY REPLACE RATHER THAN APPEND
   * ───────────────────────────────────────────────────────────────────────────
   * A store has exactly one payout account: the one every payout lands in.
   *
   * The previous `addPayoutAccount` appended, capped at three — but payouts
   * always read `payoutAccounts[0]`. So a vendor who "added a different
   * account" kept being paid into the *old* one, with a UI that gave every
   * impression they had changed it. Replacing removes that gap entirely: what
   * the page shows is where the money goes, with no index to reason about.
   *
   * The store id comes from the session, never the client — a vendor must not
   * be able to redirect another store's payouts by changing a parameter.
   */
  setPayoutAccount: baseProcedure
    .input(
      z.object({
        payoutMethod: z.string().default("Bank Transfer"),
        bankDetails: z.object({
          bankName: z.string().min(1),
          accountNumber: z.string().regex(/^\d{10}$/, "Enter 10 digits"),
          accountHolderName: z.string().min(1),
          // String: leading zeros in provider bank codes are significant.
          bankCode: z.string().min(1),
          bankId: z.number(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { store: storeToken } = ctx;

        if (!storeToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Please login to your store.",
          });
        }

        const Store = await getStoreModel();
        const store = await Store.findById(storeToken.id);

        if (!store) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "We couldn't find your store. Sign out and sign in again.",
          });
        }

        // One account, so the array is set rather than pushed to. Anything
        // previously saved was unreachable for payouts anyway.
        store.payoutAccounts = [
          {
            payoutMethod: "Bank Transfer",
            bankDetails: input.bankDetails,
          },
        ] as typeof store.payoutAccounts;

        await store.save();

        return { success: true as const, message: "Payout account saved." };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:store.payout-account.setPayoutAccount",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally.
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't save that payout account. Please try again.",
        );
      }
    }),

  /** @deprecated Use `setPayoutAccount`. Appends, and payouts only ever read
   *  index 0 — see the note on `setPayoutAccount`. */
  addPayoutAccount: baseProcedure
    .input(
      z.object({
        storeId: z.string(), // or get this from session/context
        payoutMethod: z.string(),
        bankDetails: z.object({
          bankName: z.string(),
          accountNumber: z.string(),
          accountHolderName: z.string(),
          // String: leading zeros in provider bank codes are significant.
          bankCode: z.string().min(1),
          bankId: z.number(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { storeId, payoutMethod, bankDetails } = input;
        const Store = await getStoreModel();

        const store = await Store.findById(storeId);

        if (!store) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "We couldn't find your store. Sign out and sign in again.",
          });
        }

        if (store.payoutAccounts.length >= 3) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You can only add up to 3 payout accounts.",
          });
        }

        const existingPayoutAccount = store.payoutAccounts.find(
          (account) =>
            account.payoutMethod === payoutMethod &&
            account.bankDetails.accountNumber === bankDetails.accountNumber &&
            account.bankDetails.bankName === bankDetails.bankName &&
            account.bankDetails.accountHolderName ===
              bankDetails.accountHolderName,
        );

        if (existingPayoutAccount) {
          // Update existing bank details
          existingPayoutAccount.bankDetails = bankDetails;
        } else {
          // Add new payout account
          store.payoutAccounts.push({
            payoutMethod: "Bank Transfer",
            bankDetails,
          });
        }

        await store.save();

        return { message: "Payout account updated successfully." };
      } catch (error) {
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, {
                source: "trpc:store.payout-account.addPayoutAccount",
              }),
            );
          } catch {
            // sendTelegramMessage already console.errors internally; never mask the original error
          }
        }
        throw handleTRPCError(
          error,
          "We couldn't save that payout account. Please try again.",
        );
      }
    }),
});
