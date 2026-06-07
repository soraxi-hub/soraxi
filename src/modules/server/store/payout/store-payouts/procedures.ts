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

// import { z } from "zod";
// import { baseProcedure, createTRPCRouter } from "@/trpc/init";
// import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
// import { TRPCError } from "@trpc/server";
// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";
// import { connectToDatabase } from "@/lib/db/mongoose";
// import { getStoreModel } from "@/lib/db/models/store.model";
// import {
//   getVendorWalletByVendorId,
//   deductVendorAvailableForPayout,
//   reduceVendorDebt,
// } from "@/lib/db/models/vendor-wallet.model";
// import {
//   createPayoutRecord,
//   IPayoutRecord,
// } from "@/lib/db/models/payout-record.model";
// import { createLedgerEntry } from "@/lib/db/models/ledger-entry.model";
// import {
//   LedgerEntryType,
//   LedgerEntryCategory,
//   LedgerEntityType,
//   LedgerReferenceType,
//   PayoutStatus,
//   DebtRecoveryType,
// } from "@/enums/financial.enums";
// import {
//   MINIMUM_PAYOUT_AMOUNT_KOBO,
//   DEBT_RECOVERY_PERCENTAGE,
// } from "@/constants/financial.constants";
// import { koboToNaira } from "@/lib/utils/naira";
// import { StoreStatusEnum } from "@/enums";
// import {
//   calculateDebtRecoveryDeduction,
//   calculateGatewayFee,
//   calculateWithdrawalFees,
// } from "@/lib/utils/withdrawal.utils";

// export const vendorPayoutRouter = createTRPCRouter({
//   /**
//    * Store-facing: Create a new withdrawal request
//    *
//    * Validates the vendor's identity via store password, confirms
//    * the selected bank account exists, checks wallet state, then
//    * creates a PayoutRecord and debits the vendor wallet.
//    *
//    * The actual Flutterwave transfer is handled separately by the
//    * payout background job which runs every 24 hours and picks up
//    * all INITIATED payout records.
//    */
//   createWithdrawalRequest: baseProcedure
//     .input(
//       z.object({
//         amount: z
//           .number()
//           .positive("Amount must be positive")
//           .min(
//             MINIMUM_PAYOUT_AMOUNT_KOBO,
//             `Minimum withdrawal is ₦${koboToNaira(MINIMUM_PAYOUT_AMOUNT_KOBO).toLocaleString()}`,
//           ),
//         accountId: z.string().min(1, "Bank account is required"),
//         storePassword: z.string().min(1, "Store password is required"),
//       }),
//     )
//     .mutation(async ({ input, ctx }) => {
//       try {
//         // ----------------------------------------------------------------
//         // STEP 1: Authenticate vendor via store context
//         // ----------------------------------------------------------------
//         const { store: storeToken } = ctx;

//         if (!storeToken?.id) {
//           throw new TRPCError({
//             code: "UNAUTHORIZED",
//             message: "Please login to your store.",
//           });
//         }

//         const storeId = storeToken.id;

//         // ----------------------------------------------------------------
//         // STEP 2: Guards — verify all conditions before financial writes
//         // ----------------------------------------------------------------
//         await connectToDatabase();

//         const Store = await getStoreModel();

//         // Guard 1: Store must exist — fetch with password for verification
//         const store = await Store.findById(storeId).select(
//           "password payoutAccounts walletId status",
//         );

//         if (!store) {
//           throw new TRPCError({
//             code: "NOT_FOUND",
//             message: "Store not found.",
//           });
//         }

//         // Guard 2: Verify store password — financial operations require re-authentication
//         const isPasswordValid = await bcrypt.compare(
//           input.storePassword,
//           store.password,
//         );

//         if (!isPasswordValid) {
//           throw new TRPCError({
//             code: "UNAUTHORIZED",
//             message: "Incorrect store password.",
//           });
//         }

//         // Guard 3: Store must be active
//         // NOTE: Replace "Active" with the correct StoreStatusEnum.Active value
//         if (store.status !== StoreStatusEnum.Active) {
//           throw new TRPCError({
//             code: "FORBIDDEN",
//             message:
//               "Payouts are not available for stores that are not active.",
//           });
//         }

//         // Guard 4: Bank account must exist on this store
//         const selectedAccount = store.payoutAccounts.find(
//           (acc) => acc._id?.toString() === input.accountId,
//         );

//         if (!selectedAccount) {
//           throw new TRPCError({
//             code: "NOT_FOUND",
//             message:
//               "The selected bank account could not be found on your store.",
//           });
//         }

//         // Guard 5: Vendor wallet must exist
//         const vendorWallet = await getVendorWalletByVendorId(storeId);

//         if (!vendorWallet) {
//           throw new TRPCError({
//             code: "NOT_FOUND",
//             message: "Vendor wallet not found.",
//           });
//         }

//         // Guard 6: Reject payout if wallet is fully blocked due to debt
//         if (vendorWallet.debt.recoveryType === DebtRecoveryType.FULL_BLOCK) {
//           throw new TRPCError({
//             code: "FORBIDDEN",
//             message: `Your account has an outstanding debt of ₦${koboToNaira(vendorWallet.debt.amount).toLocaleString()}. All payouts are blocked until this debt is cleared. Please contact support.`,
//           });
//         }

//         // Guard 7: Sufficient available balance
//         if (vendorWallet.balances.available < input.amount) {
//           throw new TRPCError({
//             code: "BAD_REQUEST",
//             message: `Insufficient balance. Available: ₦${koboToNaira(vendorWallet.balances.available).toLocaleString()}, Requested: ₦${koboToNaira(input.amount).toLocaleString()}.`,
//           });
//         }

//         // ----------------------------------------------------------------
//         // STEP 3: Calculate full payout breakdown
//         // ----------------------------------------------------------------

//         // Snapshot bank details at time of request
//         const bankDetailsSnapshot = {
//           bankCode: selectedAccount.bankDetails.bankCode.toString(),
//           accountNumber: selectedAccount.bankDetails.accountNumber,
//           accountName: selectedAccount.bankDetails.accountHolderName,
//         };

//         // Debt recovery
//         const { recoveryDeduction, netPayoutAmount: afterDebtAmount } =
//           calculateDebtRecoveryDeduction({
//             amount: input.amount,
//             outstandingDebt: vendorWallet.debt.amount,
//             recoveryType: vendorWallet.debt.recoveryType,
//             recoveryPercentage: DEBT_RECOVERY_PERCENTAGE,
//           });

//         // Processing fees (platform revenue)
//         const {
//           netAmount: afterProcessingFeeAmount,
//           totalFee,
//           fixedFee,
//           percentageFee,
//         } = calculateWithdrawalFees(afterDebtAmount);

//         // Gateway fee (platform expense)
//         const gatewayFee = calculateGatewayFee(afterProcessingFeeAmount);

//         // Final amount sent to Flutterwave
//         const finalTransferAmount = afterProcessingFeeAmount;

//         // ----------------------------------------------------------------
//         // STEP 4: All financial writes — atomic within a session
//         // ----------------------------------------------------------------
//         const session = await mongoose.startSession();
//         session.startTransaction();

//         try {
//           // ------------------------------------------------------------
//           // 1. Create payout record snapshot
//           // ------------------------------------------------------------
//           const payoutRecord = await createPayoutRecord({
//             vendorId: new mongoose.Types.ObjectId(storeId),
//             amountBreakdown: {
//               requestedAmount: input.amount,
//               debtRecoveryDeductionAmount: recoveryDeduction,
//               debtBeforeRecovery: vendorWallet.debt.amount,
//               debtAfterRecovery: vendorWallet.debt.amount - recoveryDeduction,
//               debtRecoveryPercentage: DEBT_RECOVERY_PERCENTAGE,
//               fixedProcessingFee: fixedFee,
//               percentageProcessingFee: percentageFee,
//               processingFee: totalFee,
//               gatewayFee: gatewayFee.total,
//               netAmount: finalTransferAmount,
//             },

//             bankDetails: bankDetailsSnapshot,
//             status: PayoutStatus.INITIATED,
//             ledgerEntryId: new mongoose.Types.ObjectId(),
//           });

//           const payoutRecordId = payoutRecord._id!.toString();

//           // ------------------------------------------------------------
//           // 2. Ledger: Payout initiated (vendor liability movement)
//           // ------------------------------------------------------------
//           await createLedgerEntry({
//             type: LedgerEntryType.DEBIT,
//             category: LedgerEntryCategory.PAYOUT_INITIATED,
//             amount: input.amount,
//             entityType: LedgerEntityType.VENDOR,
//             entityId: new mongoose.Types.ObjectId(storeId),
//             referenceType: LedgerReferenceType.PAYOUT,
//             referenceId: payoutRecord._id as mongoose.Types.ObjectId,
//             description: `Payout initiated — ₦${koboToNaira(finalTransferAmount).toLocaleString()} to ${bankDetailsSnapshot.accountName}`,
//             metadata: {
//               requestedAmount: input.amount,
//               netPayoutAmount: finalTransferAmount,
//               recoveryDeduction,
//               processingFee: totalFee,
//               gatewayFee: gatewayFee.total,
//               payoutRecordId,
//             },
//           });

//           // ------------------------------------------------------------
//           // 3. Debt recovery ledger entry (if applicable)
//           // ------------------------------------------------------------
//           if (recoveryDeduction > 0) {
//             await createLedgerEntry({
//               type: LedgerEntryType.CREDIT,
//               category: LedgerEntryCategory.DEBT_RECOVERED,
//               amount: recoveryDeduction,
//               entityType: LedgerEntityType.VENDOR,
//               entityId: new mongoose.Types.ObjectId(storeId),
//               referenceType: LedgerReferenceType.PAYOUT,
//               referenceId: payoutRecord._id as mongoose.Types.ObjectId,
//               description: `Debt recovered from payout`,
//               metadata: {
//                 payoutRecordId,
//               },
//             });

//             // Reduce vendor debt if recovery was applied
//             await reduceVendorDebt(storeId, recoveryDeduction);
//           }

//           // ------------------------------------------------------------
//           // 4. Processing fee revenue (platform income)
//           // ------------------------------------------------------------
//           await createLedgerEntry({
//             type: LedgerEntryType.CREDIT,
//             category: LedgerEntryCategory.COMMISSION_DEDUCTED,
//             amount: totalFee,
//             entityType: LedgerEntityType.PLATFORM,
//             entityId: new mongoose.Types.ObjectId(storeId),
//             referenceType: LedgerReferenceType.PAYOUT,
//             referenceId: payoutRecord._id as mongoose.Types.ObjectId,
//             description: `Processing fee earned from payout`,
//           });

//           // ------------------------------------------------------------
//           // 5. Gateway fee expense (platform cost)
//           // ------------------------------------------------------------
//           await createLedgerEntry({
//             type: LedgerEntryType.DEBIT,
//             category: LedgerEntryCategory.GATEWAY_FEE_DEDUCTED,
//             amount: gatewayFee.total,
//             entityType: LedgerEntityType.PLATFORM,
//             entityId: new mongoose.Types.ObjectId(storeId),
//             referenceType: LedgerReferenceType.PAYOUT,
//             referenceId: payoutRecord._id as mongoose.Types.ObjectId,
//             description: `Flutterwave transfer fee`,
//             metadata: gatewayFee,
//           });

//           // ------------------------------------------------------------
//           // 6. Wallet deduction (FULL amount, not net)
//           // ------------------------------------------------------------
//           await deductVendorAvailableForPayout(storeId, input.amount);

//           await session.commitTransaction();

//           return {
//             success: true,
//             message: `Withdrawal of ₦${koboToNaira(finalTransferAmount).toLocaleString()} has been queued and will be processed within 24 hours.`,
//             data: {
//               payoutRecordId,
//               requestedAmount: koboToNaira(input.amount),
//               netPayoutAmount: koboToNaira(finalTransferAmount),
//               recoveryDeduction: koboToNaira(recoveryDeduction),
//               bankDetails: {
//                 accountNumber: bankDetailsSnapshot.accountNumber,
//                 accountName: bankDetailsSnapshot.accountName,
//               },
//               estimatedProcessingTime: "Within 24 hours",
//             },
//           };
//         } catch (err) {
//           await session.abortTransaction();
//           throw err;
//         } finally {
//           session.endSession();
//         }
//       } catch (error) {
//         throw handleTRPCError(error, "Failed to create withdrawal request.");
//       }
//     }),

//   /**
//    * Store-facing: Fetch paginated withdrawal history
//    *
//    * Returns all payout records for the authenticated store in reverse
//    * chronological order. Filterable by status.
//    */
//   getWithdrawals: baseProcedure
//     .input(
//       z.object({
//         page: z.number().min(1).default(1),
//         limit: z.number().min(1).max(50).default(10),
//         status: z
//           .enum([
//             "all",
//             PayoutStatus.INITIATED,
//             PayoutStatus.PROCESSING,
//             PayoutStatus.COMPLETED,
//             PayoutStatus.FAILED,
//           ])
//           .default("all"),
//       }),
//     )
//     .query(async ({ input, ctx }) => {
//       try {
//         const { store: storeToken } = ctx;

//         if (!storeToken?.id) {
//           throw new TRPCError({
//             code: "UNAUTHORIZED",
//             message: "Please login to your store.",
//           });
//         }

//         await connectToDatabase();

//         const { getPayoutRecordModel } = await import(
//           "@/lib/db/models/payout-record.model"
//         );

//         const PayoutRecord = await getPayoutRecordModel();

//         const filter: Record<string, any> = {
//           vendorId: new mongoose.Types.ObjectId(storeToken.id),
//         };

//         if (input.status !== "all") {
//           filter.status = input.status;
//         }

//         const skip = (input.page - 1) * input.limit;
//         const total = await PayoutRecord.countDocuments(filter);

//         const payouts = await PayoutRecord.find(filter)
//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(input.limit)
//           .lean<IPayoutRecord[]>();

//         return {
//           success: true,
//           data: {
//             withdrawals: payouts.map((payout) => ({
//               payoutRecordId: (
//                 payout._id as mongoose.Types.ObjectId
//               ).toString(),
//               amountBreakdown: payout.amountBreakdown,
//               status: payout.status,
//               bankDetails: {
//                 accountNumber: payout.bankDetails.accountNumber,
//                 accountName: payout.bankDetails.accountName,
//                 bankCode: payout.bankDetails.bankCode,
//               },
//               failureReason: payout.failureReason ?? null,
//               createdAt: payout.createdAt,
//               updatedAt: payout.updatedAt,
//             })),
//             pagination: {
//               page: input.page,
//               limit: input.limit,
//               total,
//               pages: Math.ceil(total / input.limit),
//             },
//           },
//         };
//       } catch (error) {
//         throw handleTRPCError(error, "Failed to fetch withdrawal history.");
//       }
//     }),

//   /**
//    * Store-facing: Fetch a single payout record by its ID.
//    *
//    * Validates the authenticated store owns the payout record,
//    * then returns a clean, formatted response for the detail page.
//    *
//    * @param input.payoutRecordId - The _id of the payout record
//    * @returns Formatted payout details
//    */
//   getWithdrawalById: baseProcedure
//     .input(
//       z.object({
//         payoutRecordId: z.string().min(1, "Payout record ID is required"),
//       }),
//     )
//     .query(async ({ input, ctx }) => {
//       try {
//         const { store: storeToken } = ctx;

//         if (!storeToken?.id) {
//           throw new TRPCError({
//             code: "UNAUTHORIZED",
//             message: "Please login to your store.",
//           });
//         }

//         await connectToDatabase();

//         const { getPayoutRecordModel } = await import(
//           "@/lib/db/models/payout-record.model"
//         );
//         const PayoutRecord = await getPayoutRecordModel();

//         const payout = await PayoutRecord.findOne({
//           _id: new mongoose.Types.ObjectId(input.payoutRecordId),
//           vendorId: new mongoose.Types.ObjectId(storeToken.id),
//         }).lean<IPayoutRecord>();

//         if (!payout) {
//           throw new TRPCError({
//             code: "NOT_FOUND",
//             message:
//               "Payout record not found or does not belong to your store.",
//           });
//         }

//         // Format response to match expected shape
//         return {
//           success: true,
//           data: {
//             payoutRecordId: payout._id!.toString(),
//             amountBreakdown: {
//               requestedAmount: payout.amountBreakdown.requestedAmount,
//               processingFee: payout.amountBreakdown.processingFee,
//               netAmount: payout.amountBreakdown.netAmount,
//             },
//             status: payout.status,
//             bankDetails: {
//               accountNumber: payout.bankDetails.accountNumber,
//               accountName: payout.bankDetails.accountName,
//               bankCode: payout.bankDetails.bankCode,
//             },
//             failureReason: payout.failureReason ?? null,
//             flutterwaveTransferId: payout.flutterwaveTransferId ?? null,
//             createdAt: payout.createdAt,
//             updatedAt: payout.updatedAt,
//           },
//         };
//       } catch (error) {
//         throw handleTRPCError(error, "Failed to fetch withdrawal details.");
//       }
//     }),
// });
