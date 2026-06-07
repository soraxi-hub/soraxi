import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  CreatePayoutRequestInput,
  IPayoutService,
} from "../interfaces/payout-service.interface";
import { IPayoutRepository } from "@/repositories/interfaces/payout-repository.interface";
import { Payout } from "@/domain/payout/models/payout";
import { PayoutStatus, DebtRecoveryType } from "@/enums/financial.enums";
import {
  LedgerEntryType,
  LedgerEntryCategory,
  LedgerEntityType,
  LedgerReferenceType,
} from "@/enums/financial.enums";
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
import { createLedgerEntry } from "@/lib/db/models/ledger-entry.model";
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
      throw new AppError("Store not found", 404);
    }

    const isPasswordValid = await bcrypt.compare(storePassword, store.password);
    if (!isPasswordValid) {
      throw new AppError("Incorrect store password", 401);
    }

    if (store.status !== StoreStatusEnum.Active) {
      throw new AppError("Payouts are not available for inactive stores", 403);
    }

    // -----------------------------------------------------------------
    // STEP 2: Validate bank account
    // -----------------------------------------------------------------
    const selectedAccount = store.payoutAccounts.find(
      (acc) => acc._id?.toString() === accountId,
    );
    if (!selectedAccount) {
      throw new AppError("Selected bank account not found", 404);
    }

    // -----------------------------------------------------------------
    // STEP 3: Validate vendor wallet
    // -----------------------------------------------------------------
    const vendorWallet = await VendorWalletRepository.findByVendorId(storeId);
    if (!vendorWallet) {
      throw new AppError("Vendor wallet not found", 404);
    }

    if (vendorWallet.debt.recoveryType === DebtRecoveryType.FULL_BLOCK) {
      throw new AppError(
        `Your account has an outstanding debt of ₦${koboToNaira(vendorWallet.debt.amount).toLocaleString()}. All payouts are blocked.`,
        403,
      );
    }

    if (vendorWallet.balances.available < amount) {
      throw new AppError(
        `Insufficient balance. Available: ₦${koboToNaira(vendorWallet.balances.available).toLocaleString()}, Requested: ₦${koboToNaira(amount).toLocaleString()}`,
        400,
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

    // Generate new IDs
    const payoutId = new mongoose.Types.ObjectId();
    const ledgerEntryId = new mongoose.Types.ObjectId();

    // Create domain model with INITIATED status
    const payout = new Payout({
      id: payoutId.toString(),
      vendorId: storeId,
      amountBreakdown,
      bankDetails,
      status: PayoutStatus.INITIATED,
      ledgerEntryId: ledgerEntryId.toString(),
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

      // 2. Ledger: Payout initiated
      await createLedgerEntry({
        type: LedgerEntryType.DEBIT,
        category: LedgerEntryCategory.PAYOUT_INITIATED,
        amount: amount,
        entityType: LedgerEntityType.VENDOR,
        entityId: new mongoose.Types.ObjectId(storeId),
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: new mongoose.Types.ObjectId(savedPayout.id),
        description: `Payout initiated — ₦${koboToNaira(finalTransferAmount).toLocaleString()} to ${bankDetailsSnapshot.accountName}`,
        metadata: {
          requestedAmount: amount,
          netPayoutAmount: finalTransferAmount,
          recoveryDeduction,
          processingFee: totalFee,
          gatewayFee: gatewayFee.total,
          payoutRecordId: savedPayout.id,
        },
      });

      // 3. Debt recovery ledger entry (if applicable)
      if (recoveryDeduction > 0) {
        await createLedgerEntry({
          type: LedgerEntryType.CREDIT,
          category: LedgerEntryCategory.DEBT_RECOVERED,
          amount: recoveryDeduction,
          entityType: LedgerEntityType.VENDOR,
          entityId: new mongoose.Types.ObjectId(storeId),
          referenceType: LedgerReferenceType.PAYOUT,
          referenceId: new mongoose.Types.ObjectId(savedPayout.id),
          description: "Debt recovered from payout",
          metadata: { payoutRecordId: savedPayout.id },
        });

        await reduceVendorDebt(storeId, recoveryDeduction);
      }

      // 4. Processing fee revenue (platform income)
      await createLedgerEntry({
        type: LedgerEntryType.CREDIT,
        category: LedgerEntryCategory.COMMISSION_DEDUCTED,
        amount: totalFee,
        entityType: LedgerEntityType.PLATFORM,
        entityId: new mongoose.Types.ObjectId(storeId),
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: new mongoose.Types.ObjectId(savedPayout.id),
        description: "Processing fee earned from payout",
      });

      // 5. Gateway fee expense (platform cost)
      await createLedgerEntry({
        type: LedgerEntryType.DEBIT,
        category: LedgerEntryCategory.GATEWAY_FEE_DEDUCTED,
        amount: gatewayFee.total,
        entityType: LedgerEntityType.PLATFORM,
        entityId: new mongoose.Types.ObjectId(storeId),
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: new mongoose.Types.ObjectId(savedPayout.id),
        description: "Flutterwave transfer fee",
        metadata: gatewayFee,
      });

      // 6. Deduct vendor wallet (full requested amount)
      await deductVendorAvailableForPayout(storeId, amount);

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
      throw new AppError(`Payout ${id} not found`, 404);
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
      throw new AppError(`Payout ${id} not found`, 404);
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
      throw new AppError(`Payout ${id} not found`, 404);
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
