import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  CreatePayoutRequestInput,
  IPayoutService,
} from "../interfaces/payout-service.interface";
import { IPayoutRepository } from "@/repositories/interfaces/payout-repository.interface";
import { Payout } from "@/domain/payout/models/payout";
import { PayoutStatus, DebtRecoveryType } from "@/enums/financial.enums";
import { DEBT_RECOVERY_PERCENTAGE } from "@/constants/financial.constants";
import { StoreStatusEnum } from "@/enums";
import { AppError } from "@/lib/errors/app-error";
import { koboToNaira } from "@/lib/utils/naira";
import {
  calculateDebtRecoveryDeduction,
  calculateGatewayFee,
  calculateWithdrawalFees,
} from "@/lib/utils/withdrawal.utils";
import {
  getStoreModel,
  IStore,
  IStoreDocument,
} from "@/lib/db/models/store.model";
import {
  deductVendorAvailableForPayout,
  reduceVendorDebt,
} from "@/lib/db/models/vendor-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import { connectToDatabase } from "@/lib/db/mongoose";
import { PayoutAmountBreakdown } from "@/domain/payout/value-objects/payout-amount-breakdown";
import { PayoutBankDetails } from "@/domain/payout/value-objects/payout-bank-details";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { VendorWalletRepository } from "@/repositories/vendor-wallet.repository";

export class PayoutService implements IPayoutService {
  constructor(private readonly payoutRepository: IPayoutRepository) {}

  /**
   * Creates a new withdrawal request for a store.
   * Handles validation, fee calculation, persistence, and ledger entries in a transaction.
   */
  async createPayoutRequest(input: CreatePayoutRequestInput) {
    const { storeId, amount, accountId, storePassword } = input;

    // -----------------------------------------------------------------
    // STEP 1: Validate store and password
    // -----------------------------------------------------------------
    await connectToDatabase();
    const StoreModel = await getStoreModel();
    const store = await QueryBuilderFactory.queryBuilder<
      IStore,
      IStoreDocument
    >(StoreModel)
      .select("password", "payoutAccounts", "walletId", "status")
      .where("_id", new mongoose.Types.ObjectId(storeId))
      .executeOne();

    if (!store) {
      throw new AppError("NOT_FOUND", "Store not found", { storeId });
    }

    const isPasswordValid = await bcrypt.compare(storePassword, store.password);
    if (!isPasswordValid) {
      throw new AppError("UNAUTHORIZED", "Incorrect store password", {
        storeId,
      });
    }

    if (store.status !== StoreStatusEnum.Active) {
      throw new AppError(
        "FORBIDDEN",
        "Payouts are not available for inactive stores",
        { storeId, storeStatus: store.status },
      );
    }

    // -----------------------------------------------------------------
    // STEP 2: Validate bank account
    // -----------------------------------------------------------------
    const selectedAccount = store.payoutAccounts.find(
      (acc) => acc._id?.toString() === accountId,
    );
    if (!selectedAccount) {
      throw new AppError("NOT_FOUND", "Selected bank account not found", {
        storeId,
        accountId,
      });
    }

    // -----------------------------------------------------------------
    // STEP 3: Validate vendor wallet
    // -----------------------------------------------------------------
    const vendorWallet = await VendorWalletRepository.findByVendorId(storeId);
    if (!vendorWallet) {
      throw new AppError("NOT_FOUND", "Vendor wallet not found", { storeId });
    }

    if (vendorWallet.debt.recoveryType === DebtRecoveryType.FULL_BLOCK) {
      throw new AppError(
        "FORBIDDEN",
        `Your account has an outstanding debt of ₦${koboToNaira(vendorWallet.debt.amount).toLocaleString()}. All payouts are blocked.`,
        { storeId, debtAmount: vendorWallet.debt.amount },
      );
    }

    if (vendorWallet.balances.available < amount) {
      throw new AppError(
        "BAD_REQUEST",
        `Insufficient balance. Available: ₦${koboToNaira(vendorWallet.balances.available).toLocaleString()}, Requested: ₦${koboToNaira(amount).toLocaleString()}`,
        {
          storeId,
          available: vendorWallet.balances.available,
          requested: amount,
        },
      );
    }

    // -----------------------------------------------------------------
    // STEP 4: Calculate financial breakdown
    // -----------------------------------------------------------------
    const bankDetailsSnapshot = {
      bankCode: selectedAccount.bankDetails.bankCode.toString(),
      accountNumber: selectedAccount.bankDetails.accountNumber,
      accountName: selectedAccount.bankDetails.accountHolderName,
    };

    // Debt recovery
    const { recoveryDeduction, netPayoutAmount: afterDebtAmount } =
      calculateDebtRecoveryDeduction({
        amount,
        outstandingDebt: vendorWallet.debt.amount,
        recoveryType: vendorWallet.debt.recoveryType,
        recoveryPercentage: DEBT_RECOVERY_PERCENTAGE,
      });

    // Processing fees
    const {
      netAmount: afterProcessingFeeAmount,
      totalFee,
      fixedFee,
      percentageFee,
    } = calculateWithdrawalFees(afterDebtAmount);

    // Gateway fee
    const gatewayFee = calculateGatewayFee(afterProcessingFeeAmount);
    const finalTransferAmount = afterProcessingFeeAmount;

    // Build value objects
    const amountBreakdown = new PayoutAmountBreakdown({
      requestedAmount: amount,
      debtRecoveryDeductionAmount: recoveryDeduction,
      debtBeforeRecovery: vendorWallet.debt.amount,
      debtAfterRecovery: vendorWallet.debt.amount - recoveryDeduction,
      debtRecoveryPercentage: DEBT_RECOVERY_PERCENTAGE,
      fixedProcessingFee: fixedFee,
      percentageProcessingFee: percentageFee,
      processingFee: totalFee,
      gatewayFee: gatewayFee.total,
      netAmount: finalTransferAmount,
    });

    const bankDetails = new PayoutBankDetails({
      bankCode: bankDetailsSnapshot.bankCode,
      accountNumber: bankDetailsSnapshot.accountNumber,
      accountName: bankDetailsSnapshot.accountName,
    });

    // Generate payout ID
    const payoutId = new mongoose.Types.ObjectId();

    // Create domain model with INITIATED status
    // NOTE: ledgerEntryId is a legacy field from the single-entry system.
    // In the double-entry system, multiple journal entries are linked to this
    // payout via referenceId = payoutId — there is no single representative entry.
    // The field is retained here to satisfy the domain model constructor signature.
    const payout = new Payout({
      id: payoutId.toString(),
      vendorId: storeId,
      amountBreakdown,
      bankDetails,
      status: PayoutStatus.INITIATED,
      ledgerEntryId: payoutId.toString(),
      flutterwaveTransferId: undefined,
      flutterwaveStatus: undefined,
      failureReason: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // -----------------------------------------------------------------
    // STEP 5: Execute transaction
    // -----------------------------------------------------------------
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Save payout record
      const savedPayout = await this.payoutRepository.create(payout, session);

      const vendorObjectId = new mongoose.Types.ObjectId(storeId);
      const savedPayoutObjectId = new mongoose.Types.ObjectId(savedPayout.id);
      const writer = await JournalEntryWriter.init();

      // 2. Debt recovery journal entry (if applicable — must run before
      //    writePayoutInitiated so the amount flowing into PAYOUT_PROCESSING
      //    is already net of any debt recovery deduction)
      //
      //    DEBIT  DEBT_RECOVERY_CLEARING   recoveryDeduction
      //    CREDIT VENDOR_AVAILABLE         recoveryDeduction
      //    DEBIT  PLATFORM_REVENUE_PENALTIES recoveryDeduction
      //    CREDIT DEBT_RECOVERY_CLEARING   recoveryDeduction
      if (recoveryDeduction > 0) {
        await writer.writeDebtRecovery({
          vendorId: vendorObjectId,
          recoveredAmount: recoveryDeduction,
          payoutId: savedPayoutObjectId,
          session,
        });

        // Reduce the stored debt balance on the vendor wallet cache
        await reduceVendorDebt(storeId, recoveryDeduction, session);
      }

      // 3. Processing fee journal entry — Soraxi's internal withdrawal fee
      //    withheld from the vendor's available balance before the net amount
      //    enters PAYOUT_PROCESSING.
      //
      //    DEBIT  VENDOR_AVAILABLE            totalFee
      //    CREDIT PLATFORM_REVENUE_COMMISSION totalFee
      if (totalFee > 0) {
        await writer.writePayoutProcessingFee({
          vendorId: vendorObjectId,
          processingFee: totalFee,
          payoutId: savedPayoutObjectId,
          session,
        });
      }

      // 4. Payout initiated — net amount (after debt recovery and processing
      //    fees) moves from VENDOR_AVAILABLE into PAYOUT_PROCESSING.
      //
      //    DEBIT  PAYOUT_PROCESSING  afterProcessingFeeAmount
      //    CREDIT VENDOR_AVAILABLE   afterProcessingFeeAmount
      await writer.writePayoutInitiated({
        vendorId: vendorObjectId,
        netPayoutAmount: afterProcessingFeeAmount,
        payoutId: savedPayoutObjectId,
        session,
      });

      // 5. Gateway fee — Flutterwave's transfer charge recorded as a
      //    platform expense at initiation time.
      //
      //    DEBIT  GATEWAY_FEES_EXPENSE  gatewayFee.total
      //    CREDIT PLATFORM_ESCROW       gatewayFee.total
      if (gatewayFee.total > 0) {
        await writer.writeGatewayFee({
          feeAmount: gatewayFee.total,
          payoutId: savedPayoutObjectId,
          session,
        });
      }

      // 6. Deduct vendor wallet cache (full requested amount).
      //    recoveryDeduction + totalFee + afterProcessingFeeAmount = amount,
      //    so this mirrors the total VENDOR_AVAILABLE reduction across all
      //    journal entries above.
      await deductVendorAvailableForPayout(storeId, amount, session);

      await session.commitTransaction();

      return {
        message: `Withdrawal of ${payout.formattedNetAmount} has been queued and will be processed within 24 hours.`,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getPayoutById(id: string) {
    const payout = await this.payoutRepository.findById(id);
    return payout ? payout.toJSON() : null;
  }

  async getVendorPayoutHistory(
    vendorId: string,
    page: number,
    limit: number,
    status: PayoutStatus | "all" = "all",
  ) {
    const { payouts, total } = await this.payoutRepository.findByVendorId(
      vendorId,
      page,
      limit,
      status,
    );
    return {
      payouts: payouts.map((p) => p.toJSON()),
      total,
      page,
      limit,
    };
  }

  async updatePayoutFlutterwaveTransferId(
    id: string,
    flutterwaveTransferId: string,
    session: mongoose.ClientSession,
  ) {
    // Retrieve existing payout
    const payout = await this.payoutRepository.findById(id);
    if (!payout) {
      throw new AppError("NOT_FOUND", `Payout ${id} not found`, { id });
    }

    // Domain transition
    const processingPayout = payout.markProcessing(flutterwaveTransferId);

    // Persist the updated state
    await this.payoutRepository.markProcessing(
      processingPayout.id,
      processingPayout.flutterwaveTransferId!,
      session,
    );
  }

  async completePayout(id: string, session: mongoose.ClientSession) {
    const payout = await this.payoutRepository.findById(id);
    if (!payout) {
      throw new AppError("NOT_FOUND", `Payout ${id} not found`, { id });
    }

    const completedPayout = payout.markCompleted();
    // Use the repository's markCompleted which calls the model function
    const updated = await this.payoutRepository.markCompleted(
      completedPayout.id,
      session,
    );
    return updated.toJSON();
  }

  async failPayout(
    id: string,
    reason: string,
    session: mongoose.ClientSession,
  ) {
    const payout = await this.payoutRepository.findById(id);
    if (!payout) {
      throw new AppError("NOT_FOUND", `Payout ${id} not found`, { id });
    }

    const failedPayout = payout.markFailed(reason);
    const updated = await this.payoutRepository.markFailed(
      failedPayout.id,
      reason,
      session,
    );
    return updated.toJSON();
  }
}
