import { IVendorWallet } from "@/lib/db/models/vendor-wallet.model";
import {
  IVendorWalletInfo,
  PublicToJSONVendorWalletType,
} from "./wallet-interface";

export type BaseVendorWallet = IVendorWallet;

export class VendorWallet implements IVendorWalletInfo {
  constructor(protected props: BaseVendorWallet) {}

  get walletId(): string {
    return this.props._id?.toString() ?? "";
  }

  get vendorId(): string {
    return this.props.vendorId.toString();
  }

  get balances() {
    return this.props.balances;
  }

  get debt() {
    return {
      amount: this.props.debt.amount,
      recoveryType: this.props.debt.recoveryType,
      recoveryPercentage: this.props.debt.recoveryPercentage,
    };
  }

  get availableBalance(): number {
    return this.props.balances.available;
  }

  get pendingBalance(): number {
    return this.props.balances.pending;
  }

  get disputedBalance(): number {
    return this.props.balances.disputed;
  }

  get totalBalance(): number {
    return this.props.balances.total;
  }

  get debtAmount(): number {
    return this.props.debt.amount;
  }

  get hasDebt(): boolean {
    return this.debtAmount > 0;
  }

  get currency(): string {
    return this.props.currency;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Convert domain object into plain JSON object
   */
  toJSON(): PublicToJSONVendorWalletType {
    return {
      walletId: this.walletId,
      vendorId: this.vendorId,

      balances: {
        available: this.availableBalance,
        pending: this.pendingBalance,
        disputed: this.disputedBalance,
        total: this.totalBalance,
      },

      debt: {
        amount: this.debt.amount,
        recoveryType: this.debt.recoveryType,
        recoveryPercentage: this.debt.recoveryPercentage,
      },

      currency: this.currency,

      hasDebt: this.hasDebt,
      debtAmount: this.debtAmount,

      availableBalance: this.availableBalance,
      pendingBalance: this.pendingBalance,
      disputedBalance: this.disputedBalance,
      totalBalance: this.totalBalance,

      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
