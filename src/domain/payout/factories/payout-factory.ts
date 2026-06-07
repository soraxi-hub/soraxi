import { IPayoutRecord } from "@/lib/db/models/payout-record.model";
import { Payout, PayoutProps } from "../models/payout";
import { PayoutAmountBreakdown } from "../value-objects/payout-amount-breakdown";
import { PayoutBankDetails } from "../value-objects/payout-bank-details";
import mongoose from "mongoose";

export class PayoutFactory {
  /**
   * Creates a domain model from a persistence document (Mongoose lean or document).
   * @param doc - The payout record as stored in the database.
   */
  static fromPersistence(doc: IPayoutRecord): Payout {
    if (!doc._id) {
      throw Error(
        "[PayoutFactory.fromPersistence]: Payout Id (doc._id) is required",
      );
    }

    const props: PayoutProps = {
      id: doc._id.toString(),
      vendorId: doc.vendorId.toString(),
      amountBreakdown: new PayoutAmountBreakdown({
        requestedAmount: doc.amountBreakdown.requestedAmount,
        debtRecoveryDeductionAmount:
          doc.amountBreakdown.debtRecoveryDeductionAmount,
        debtBeforeRecovery: doc.amountBreakdown.debtBeforeRecovery,
        debtAfterRecovery: doc.amountBreakdown.debtAfterRecovery,
        debtRecoveryPercentage: doc.amountBreakdown.debtRecoveryPercentage,
        fixedProcessingFee: doc.amountBreakdown.fixedProcessingFee,
        percentageProcessingFee: doc.amountBreakdown.percentageProcessingFee,
        processingFee: doc.amountBreakdown.processingFee,
        gatewayFee: doc.amountBreakdown.gatewayFee,
        netAmount: doc.amountBreakdown.netAmount,
      }),
      bankDetails: new PayoutBankDetails({
        bankCode: doc.bankDetails.bankCode,
        accountNumber: doc.bankDetails.accountNumber,
        accountName: doc.bankDetails.accountName,
      }),
      flutterwaveTransferId: doc.flutterwaveTransferId,
      flutterwaveStatus: doc.flutterwaveStatus,
      status: doc.status,
      ledgerEntryId: doc.ledgerEntryId.toString(),
      failureReason: doc.failureReason,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    return new Payout(props);
  }

  /**
   * Prepares a plain object suitable for database creation (input for createPayoutRecord).
   * @param payout - The domain model instance.
   */
  static toCreateInput(
    payout: Payout,
  ): Omit<IPayoutRecord, "_id" | "createdAt" | "updatedAt"> {
    return {
      vendorId: payout.vendorId as unknown as mongoose.Types.ObjectId, // Mongoose expects ObjectId, but we'll cast
      amountBreakdown: {
        requestedAmount: payout.amountBreakdown.requestedAmount,
        debtRecoveryDeductionAmount:
          payout.amountBreakdown.debtRecoveryDeductionAmount,
        debtBeforeRecovery: payout.amountBreakdown.debtBeforeRecovery,
        debtAfterRecovery: payout.amountBreakdown.debtAfterRecovery,
        debtRecoveryPercentage: payout.amountBreakdown.debtRecoveryPercentage,
        fixedProcessingFee: payout.amountBreakdown.fixedProcessingFee,
        percentageProcessingFee: payout.amountBreakdown.percentageProcessingFee,
        processingFee: payout.amountBreakdown.processingFee,
        gatewayFee: payout.amountBreakdown.gatewayFee,
        netAmount: payout.amountBreakdown.netAmount,
      },
      bankDetails: {
        bankCode: payout.bankDetails.bankCode,
        accountNumber: payout.bankDetails.accountNumber,
        accountName: payout.bankDetails.accountName,
      },
      flutterwaveTransferId: payout.flutterwaveTransferId,
      flutterwaveStatus: payout.flutterwaveStatus,
      status: payout.status,
      ledgerEntryId: payout.ledgerEntryId as unknown as mongoose.Types.ObjectId, // Mongoose expects ObjectId, but we'll cast
      failureReason: payout.failureReason,
    };
  }

  /**
   * Prepares an update object for existing payout (e.g., for markCompleted, markFailed).
   * @param payout - The updated domain model.
   */
  static toUpdate(payout: Payout): Partial<IPayoutRecord> {
    return {
      status: payout.status,
      flutterwaveTransferId: payout.flutterwaveTransferId,
      flutterwaveStatus: payout.flutterwaveStatus,
      failureReason: payout.failureReason,
      updatedAt: payout.updatedAt,
    };
  }
}
