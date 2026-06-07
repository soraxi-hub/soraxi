import {
  FlutterwaveTransferStatus,
  PayoutStatus,
} from "@/enums/financial.enums";
import { IPayout } from "../interfaces/payout.interface";
import { koboToNaira, formatNaira } from "@/lib/utils/naira";
import { IPayoutAmountBreakdown } from "../value-objects/payout-amount-breakdown";
import { IPayoutBankDetails } from "../value-objects/payout-bank-details";
import { DateFormatter } from "@/lib/utils/date-formatter";

export interface PayoutProps {
  id: string;
  vendorId: string;
  amountBreakdown: IPayoutAmountBreakdown;
  bankDetails: IPayoutBankDetails;
  flutterwaveTransferId?: string;
  flutterwaveStatus?: FlutterwaveTransferStatus;
  status: PayoutStatus;
  ledgerEntryId: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rich domain model for a Payout.
 * All monetary amounts are stored and manipulated in kobo.
 */
export class Payout implements IPayout {
  constructor(private readonly props: PayoutProps) {}

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------
  get id(): string {
    return this.props.id;
  }

  get vendorId(): string {
    return this.props.vendorId;
  }

  get amountBreakdown(): IPayoutAmountBreakdown {
    return { ...this.props.amountBreakdown };
  }

  get bankDetails(): IPayoutBankDetails {
    return { ...this.props.bankDetails };
  }

  get flutterwaveTransferId(): string | undefined {
    return this.props.flutterwaveTransferId;
  }

  get flutterwaveStatus(): FlutterwaveTransferStatus | undefined {
    return this.props.flutterwaveStatus;
  }

  get status(): PayoutStatus {
    return this.props.status;
  }

  get ledgerEntryId(): string {
    return this.props.ledgerEntryId;
  }

  get failureReason(): string | undefined {
    return this.props.failureReason;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // -------------------------------------------------------------------------
  // Monetary value helpers (following Product pattern)
  // -------------------------------------------------------------------------

  /**
   * Raw numeric naira value of the net amount (final payout to vendor).
   * Example: 5000
   */
  get netAmountInNaira(): number {
    return koboToNaira(this.amountBreakdown.netAmount);
  }

  /**
   * Formatted display value for net amount.
   * Example: ₦5,000
   */
  get formattedNetAmount(): string {
    return formatNaira(this.amountBreakdown.netAmount, { showDecimals: true });
  }

  /**
   * Raw numeric naira value of the processing fee.
   */
  get processingFeeInNaira(): number {
    return koboToNaira(this.amountBreakdown.processingFee);
  }

  /**
   * Formatted processing fee.
   */
  get formattedProcessingFee(): string {
    return formatNaira(this.amountBreakdown.processingFee);
  }

  /**
   * Raw numeric naira value of the gateway fee.
   */
  get gatewayFeeInNaira(): number {
    return koboToNaira(this.amountBreakdown.gatewayFee ?? 0);
  }

  /**
   * Formatted gateway fee.
   */
  get formattedGatewayFee(): string {
    return formatNaira(this.amountBreakdown.gatewayFee ?? 0);
  }

  /**
   * Raw numeric naira value of the requested amount.
   */
  get requestedAmountInNaira(): number {
    return koboToNaira(this.amountBreakdown.requestedAmount);
  }

  /**
   * Formatted requested amount.
   */
  get formattedRequestedAmount(): string {
    return formatNaira(this.amountBreakdown.requestedAmount);
  }

  get percentageProcessingFeeInNaira(): number {
    return koboToNaira(this.amountBreakdown.percentageProcessingFee);
  }

  get formattedPercentageProcessingFee(): string {
    return formatNaira(this.amountBreakdown.percentageProcessingFee);
  }

  get fixedProcessingFeeInNaira(): number {
    return koboToNaira(this.amountBreakdown.fixedProcessingFee);
  }

  get formattedFixedProcessingFee(): string {
    return formatNaira(this.amountBreakdown.fixedProcessingFee);
  }

  get debtAfterRecoveryInNaira(): number {
    return koboToNaira(this.amountBreakdown.debtAfterRecovery ?? 0);
  }

  get formattedDebtAfterRecovery(): string {
    return formatNaira(this.amountBreakdown.debtAfterRecovery ?? 0);
  }

  get debtBeforeRecoveryInNaira(): number {
    return koboToNaira(this.amountBreakdown.debtBeforeRecovery ?? 0);
  }

  get formattedDebtBeforeRecovery(): string {
    return formatNaira(this.amountBreakdown.debtBeforeRecovery ?? 0);
  }

  get debtRecoveryDeductionAmountInNaira(): number {
    return koboToNaira(this.amountBreakdown.debtRecoveryDeductionAmount);
  }

  get formattedDebtRecoveryDeductionAmountInNaira(): string {
    return formatNaira(this.amountBreakdown.debtRecoveryDeductionAmount);
  }

  // -------------------------------------------------------------------------
  // State transition methods (domain behavior)
  // -------------------------------------------------------------------------

  /**
   * Moves the payout to PROCESSING state.
   * @param flutterwaveTransferId - The Flutterwave transfer ID.
   * @param flutterwaveStatus - Optional status from Flutterwave.
   * @returns A new Payout instance with updated state (immutable).
   * @throws Error if transition is invalid.
   */
  markProcessing(flutterwaveTransferId: string): Payout {
    if (this.status !== PayoutStatus.INITIATED) {
      throw new Error(
        `Cannot mark payout as PROCESSING from current status: ${this.status}`,
      );
    }
    if (!flutterwaveTransferId) {
      throw new Error(
        "Flutterwave transfer ID is required to move to PROCESSING",
      );
    }
    return new Payout({
      ...this.props,
      flutterwaveTransferId,
      status: PayoutStatus.PROCESSING,
      updatedAt: new Date(),
    });
  }

  /**
   * Moves the payout to COMPLETED state.
   * @returns A new Payout instance.
   * @throws Error if transition is invalid.
   */
  markCompleted(): Payout {
    if (this.status !== PayoutStatus.PROCESSING) {
      throw new Error(
        `Cannot mark payout as COMPLETED from current status: ${this.status}`,
      );
    }
    return new Payout({
      ...this.props,
      status: PayoutStatus.COMPLETED,
      updatedAt: new Date(),
    });
  }

  /**
   * Moves the payout to FAILED state.
   * @param reason - The failure reason.
   * @returns A new Payout instance.
   * @throws Error if transition is invalid.
   */
  markFailed(reason: string): Payout {
    if (
      this.status !== PayoutStatus.PROCESSING &&
      this.status !== PayoutStatus.INITIATED
    ) {
      throw new Error(
        `Cannot mark payout as FAILED from current status: ${this.status}`,
      );
    }
    if (!reason || reason.trim() === "") {
      throw new Error("Failure reason is required when marking as FAILED");
    }
    return new Payout({
      ...this.props,
      status: PayoutStatus.FAILED,
      failureReason: reason,
      updatedAt: new Date(),
    });
  }

  /**
   * Attaches or updates the Flutterwave transfer ID (e.g., for retries).
   * @param transferId - New transfer ID.
   * @param status - Optional Flutterwave status.
   * @returns A new Payout instance.
   */
  attachFlutterwaveTransferId(
    transferId: string,
    status?: FlutterwaveTransferStatus,
  ): Payout {
    if (!transferId) {
      throw new Error("Transfer ID is required");
    }
    return new Payout({
      ...this.props,
      flutterwaveTransferId: transferId,
      flutterwaveStatus: status,
      updatedAt: new Date(),
    });
  }

  // -------------------------------------------------------------------------
  // JSON serialization (converts kobo to Naira for API responses)
  // -------------------------------------------------------------------------
  toJSON() {
    return {
      id: this.id,
      vendorId: this.vendorId,
      amountBreakdown: {
        requestedAmount: this.requestedAmountInNaira,
        formattedRequestedAmount: this.formattedRequestedAmount,
        debtRecoveryDeductionAmount: this.debtRecoveryDeductionAmountInNaira,
        formattedDebtRecoveryDeductionAmountInNaira:
          this.formattedDebtRecoveryDeductionAmountInNaira,
        debtBeforeRecovery: this.debtBeforeRecoveryInNaira,
        formattedDebtBeforeRecovery: this.formattedDebtBeforeRecovery,
        debtAfterRecovery: this.debtAfterRecoveryInNaira,
        formattedDebtAfterRecovery: this.formattedDebtAfterRecovery,
        debtRecoveryPercentage:
          this.amountBreakdown.debtRecoveryPercentage ?? 0,
        fixedProcessingFee: this.fixedProcessingFeeInNaira,
        formattedFixedProcessingFee: this.formattedFixedProcessingFee,
        percentageProcessingFee: this.percentageProcessingFeeInNaira,
        formattedPercentageProcessingFee: this.formattedPercentageProcessingFee,
        processingFee: this.processingFeeInNaira,
        formattedProcessingFee: this.formattedProcessingFee,
        gatewayFee: this.gatewayFeeInNaira,
        formattedGatewayFee: this.formattedGatewayFee,
        netAmount: this.netAmountInNaira,
        formattedNetAmount: this.formattedNetAmount,
      },
      bankDetails: {
        bankCode: this.bankDetails.bankCode,
        accountNumber: this.bankDetails.accountNumber,
        accountName: this.bankDetails.accountName,
      },
      flutterwaveTransferId: this.flutterwaveTransferId,
      flutterwaveStatus: this.flutterwaveStatus,
      status: this.status,
      ledgerEntryId: this.ledgerEntryId,
      failureReason: this.failureReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      formattedCreatedAtDate: DateFormatter.shortDate(this.createdAt),
      formattedCreatedAtTime: DateFormatter.timeOnly(this.updatedAt),
    };
  }
}
