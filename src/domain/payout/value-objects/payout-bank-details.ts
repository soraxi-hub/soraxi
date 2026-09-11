export interface IPayoutBankDetails {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export class PayoutBankDetails implements IPayoutBankDetails {
  public readonly bankCode: string;
  public readonly bankName: string;
  public readonly accountNumber: string;
  public readonly accountName: string;

  constructor(props: IPayoutBankDetails) {
    if (!props.bankCode || props.bankCode.trim() === "") {
      throw new Error("Bank code is required");
    }
    if (!props.bankName || props.bankName.trim() === "") {
      throw new Error("Bank name is required");
    }
    if (!props.accountNumber || props.accountNumber.trim() === "") {
      throw new Error("Account number is required");
    }
    if (!props.accountName || props.accountName.trim() === "") {
      throw new Error("Account name is required");
    }
    this.bankCode = props.bankCode;
    this.bankName = props.bankName;
    this.accountNumber = props.accountNumber;
    this.accountName = props.accountName;
  }
}

/**
 * Anything shaped like a payout's bank details — a validated
 * `PayoutBankDetails` instance, or a raw Mongoose `.lean()` read.
 */
interface PayoutBankDetailsLike {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface PayoutBankDetailsJSON {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

/**
 * The single place a payout's bank details become a plain object — for a
 * tRPC response or the domain model's own `toJSON()`.
 */
export function toPayoutBankDetailsJSON(
  bankDetails: PayoutBankDetailsLike,
): PayoutBankDetailsJSON {
  return {
    bankCode: bankDetails.bankCode,
    bankName: bankDetails.bankName ?? "Unknown",
    accountNumber: bankDetails.accountNumber,
    accountName: bankDetails.accountName,
  };
}
