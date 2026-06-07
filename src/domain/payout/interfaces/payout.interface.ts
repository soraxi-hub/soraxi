import {
  FlutterwaveTransferStatus,
  PayoutStatus,
} from "@/enums/financial.enums";
import { IPayoutAmountBreakdown } from "../value-objects/payout-amount-breakdown";
import { IPayoutBankDetails } from "../value-objects/payout-bank-details";

/**
 * Domain contract for the Payout aggregate.
 */
export interface IPayout {
  readonly id: string;
  readonly vendorId: string;
  readonly amountBreakdown: IPayoutAmountBreakdown;
  readonly bankDetails: IPayoutBankDetails;
  readonly flutterwaveTransferId?: string;
  readonly flutterwaveStatus?: FlutterwaveTransferStatus;
  readonly status: PayoutStatus;
  readonly ledgerEntryId: string;
  readonly failureReason?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  /**
   * Converts the domain aggregate to a plain JSON object suitable for API responses.
   * All monetary values are converted from kobo to Naira.
   */
  toJSON(): {
    id: string;
    vendorId: string;
    amountBreakdown: {
      requestedAmount: number;
      debtRecoveryDeductionAmount: number;
      debtBeforeRecovery: number;
      debtAfterRecovery: number;
      debtRecoveryPercentage: number;
      fixedProcessingFee: number;
      percentageProcessingFee: number;
      processingFee: number;
      gatewayFee: number;
      netAmount: number;
    };
    bankDetails: {
      bankCode: string;
      accountNumber: string;
      accountName: string;
    };
    flutterwaveTransferId?: string;
    flutterwaveStatus?: string;
    status: PayoutStatus;
    ledgerEntryId: string;
    failureReason?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
