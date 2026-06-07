import { DebtRecoveryType } from "@/enums/financial.enums";

export interface VendorWalletBalancesInfo {
  available: number;
  pending: number;
  disputed: number;
  total: number;
}

export interface VendorWalletDebtInfo {
  amount: number;
  recoveryType: DebtRecoveryType | null;
  recoveryPercentage: number;
}

export interface IVendorWalletInfo {
  walletId: string;
  vendorId: string;

  balances: VendorWalletBalancesInfo;
  debt: VendorWalletDebtInfo;

  currency: string;

  hasDebt: boolean;
  debtAmount: number;

  availableBalance: number;
  pendingBalance: number;
  disputedBalance: number;
  totalBalance: number;

  createdAt: Date;
  updatedAt: Date;
}

export type PublicToJSONVendorWalletType = IVendorWalletInfo;
