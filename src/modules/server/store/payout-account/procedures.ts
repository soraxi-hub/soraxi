import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

import { TRPCError } from "@trpc/server";
import { getStoreModel } from "@/lib/db/models/store.model";

// Define a single Bank type
export type Bank = {
  id: number;
  code: string;
  name: string;
};

export const paymentRouter = createTRPCRouter({
  getStorePayoutAccounts: baseProcedure.query(async ({ ctx }) => {
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
      return {
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

    // console.log("formattedPayoutAccounts", formattedPayoutAccounts);

    return formattedPayoutAccounts;
  }),

  getBanks: baseProcedure.query(async () => {
    if (!process.env.PAYSTACK_SECRET_KEY) {
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
      // "https://api.flutterwave.com/v3/banks/NG?include_provider_type=1",
      "https://api.flutterwave.com/v3/banks/NG",
      options
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

    // console.log("formattedBanks", formattedBanks);

    return formattedBanks;
  }),

  resolveAccountNumber: baseProcedure
    .input(z.object({ accountNumber: z.string(), bankCode: z.string() }))
    .mutation(async ({ input }) => {
      const { accountNumber, bankCode } = input;

      if (!process.env.FLUTTERWAVE_SECRET_KEY) {
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
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number: accountNumber.toString(),
          account_bank: bankCode.toString(),
        }),
      };

      const response = await fetch(
        "https://api.flutterwave.com/v3/accounts/resolve",
        options
      );

      const result = (await response.json()) as {
        status: string;
        message: string;
        data: {
          account_number: string;
          account_name: string;
        };
      };

      return result;
    }),

  addPayoutAccount: baseProcedure
    .input(
      z.object({
        storeId: z.string(), // or get this from session/context
        payoutMethod: z.string(),
        bankDetails: z.object({
          bankName: z.string(),
          accountNumber: z.string(),
          accountHolderName: z.string(),
          bankCode: z.number(),
          bankId: z.number(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const { storeId, payoutMethod, bankDetails } = input;
      const Store = await getStoreModel();

      const store = await Store.findById(storeId);

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
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
            bankDetails.accountHolderName
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
    }),
});
