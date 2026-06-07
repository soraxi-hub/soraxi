export interface IPayoutBankDetails {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export class PayoutBankDetails implements IPayoutBankDetails {
  public readonly bankCode: string;
  public readonly accountNumber: string;
  public readonly accountName: string;

  constructor(props: IPayoutBankDetails) {
    if (!props.bankCode || props.bankCode.trim() === "") {
      throw new Error("Bank code is required");
    }
    if (!props.accountNumber || props.accountNumber.trim() === "") {
      throw new Error("Account number is required");
    }
    if (!props.accountName || props.accountName.trim() === "") {
      throw new Error("Account name is required");
    }
    this.bankCode = props.bankCode;
    this.accountNumber = props.accountNumber;
    this.accountName = props.accountName;
  }
}
