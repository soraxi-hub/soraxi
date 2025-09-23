import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

import { TRPCError } from "@trpc/server";
import { getStoreModel } from "@/lib/db/models/store.model";

// Define a single Bank type
export type Bank = {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null; // Gateway can be null
  pay_with_bank: boolean;
  supports_transfer: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  is_deleted: boolean;
  createdAt: string; // Date can be used if you want to handle date objects
  updatedAt: string; // Date can be used if you want to handle date objects
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
    const url = "https://api.paystack.co/bank";
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const banks = (await response.json()) as {
      status: true;
      message: string;
      data: Bank[];
    };

    const formattedBanks = banks.data.map((bank) => {
      return {
        id: bank.id,
        name: bank.name,
        slug: bank.slug,
        code: bank.code,
        longcode: bank.longcode,
        gateway: bank.gateway,
        pay_with_bank: bank.pay_with_bank,
        supports_transfer: bank.supports_transfer,
        active: bank.active,
        country: bank.country,
        currency: bank.currency,
        type: bank.type,
        is_deleted: bank.is_deleted,
        createdAt: bank.createdAt,
        updatedAt: bank.updatedAt,
      };
    });

    // console.log("formattedBanks", formattedBanks);

    return formattedBanks;
  }),

  resolveAccountNumber: baseProcedure
    .input(z.object({ accountNumber: z.number(), bankCode: z.number() }))
    .mutation(async ({ input }) => {
      const { accountNumber, bankCode } = input;
      const url = `https://api.paystack.co/bank/resolve?account_number=${Number(
        accountNumber
      )}&bank_code=${Number(bankCode)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      });

      const result = (await response.json()) as {
        status: boolean;
        message: string;
        data: {
          account_number: string;
          account_name: string;
        };
      };

      // console.log("result", result);
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
