export interface IPayoutAmountBreakdown {
  requestedAmount: number; // in kobo
  debtRecoveryDeductionAmount: number;
  debtBeforeRecovery?: number;
  debtAfterRecovery?: number;
  debtRecoveryPercentage?: number;
  fixedProcessingFee: number;
  percentageProcessingFee: number;
  processingFee: number;
  gatewayFee?: number;
  netAmount: number; // final amount after all fees
}

/**
 * Value object representing the financial breakdown of a payout.
 * All amounts are stored in kobo.
 */
export class PayoutAmountBreakdown implements IPayoutAmountBreakdown {
  public readonly requestedAmount: number;
  public readonly debtRecoveryDeductionAmount: number;
  public readonly debtBeforeRecovery?: number;
  public readonly debtAfterRecovery?: number;
  public readonly debtRecoveryPercentage?: number;
  public readonly fixedProcessingFee: number;
  public readonly percentageProcessingFee: number;
  public readonly processingFee: number;
  public readonly gatewayFee?: number;
  public readonly netAmount: number;

  constructor(props: IPayoutAmountBreakdown) {
    // Validation
    if (props.requestedAmount <= 0) {
      throw new Error("Requested amount must be greater than zero");
    }
    if (props.netAmount < 0) {
      throw new Error("Net amount cannot be negative");
    }
    if (props.processingFee < 0) {
      throw new Error("Processing fee cannot be negative");
    }
    if (!props.gatewayFee || props.gatewayFee < 0) {
      throw new Error("Gateway fee cannot be negative");
    }
    if (props.debtRecoveryDeductionAmount < 0) {
      throw new Error("Debt recovery deduction cannot be negative");
    }

    this.requestedAmount = props.requestedAmount;
    this.debtRecoveryDeductionAmount = props.debtRecoveryDeductionAmount;
    this.debtBeforeRecovery = props.debtBeforeRecovery;
    this.debtAfterRecovery = props.debtAfterRecovery;
    this.debtRecoveryPercentage = props.debtRecoveryPercentage;
    this.fixedProcessingFee = props.fixedProcessingFee;
    this.percentageProcessingFee = props.percentageProcessingFee;
    this.processingFee = props.processingFee;
    this.gatewayFee = props.gatewayFee;
    this.netAmount = props.netAmount;
  }

  /**
   * Create a copy with updated fields (immutable).
   */
  withUpdates(updates: Partial<IPayoutAmountBreakdown>): PayoutAmountBreakdown {
    return new PayoutAmountBreakdown({ ...this, ...updates });
  }
}
