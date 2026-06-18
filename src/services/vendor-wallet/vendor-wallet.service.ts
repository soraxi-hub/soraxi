import { VendorWalletFactory } from "@/domain/vendor-wallet/vendor-wallet-factory";
import { VendorWalletRepository } from "@/repositories/vendor-wallet.repository";
import { AppError } from "@/lib/errors/app-error";
import { VendorWallet } from "@/domain/vendor-wallet/vendor-wallet.entity";
import { PublicToJSONVendorWalletType } from "@/domain/vendor-wallet/wallet-interface";
import mongoose from "mongoose";

/**
 * Vendor Wallet Service
 *
 * Responsible for orchestrating wallet-related business operations.
 */
export class VendorWalletService {
  /**
   * Fetch a vendor/store wallet.
   *
   * Returns a fully hydrated domain entity that can be used
   * throughout the application layer.
   *
   * @param vendorId Store/Vendor ID
   * @throws AppError if wallet does not exist
   */
  static async getVendorWallet(vendorId: string): Promise<VendorWallet> {
    const wallet = await VendorWalletRepository.findByVendorId(vendorId);

    if (!wallet) {
      throw new AppError("NOT_FOUND", "Vendor wallet not found");
    }

    return VendorWalletFactory.createWallet(wallet);
  }

  /**
   * Fetch wallet and return its public JSON representation.
   *
   * Useful for API responses and tRPC procedures where
   * callers do not need access to the domain entity itself.
   *
   * @param vendorId Store/Vendor ID
   */
  static async getVendorWalletData(
    vendorId: string,
  ): Promise<PublicToJSONVendorWalletType> {
    const wallet = await this.getVendorWallet(vendorId);

    return wallet.toJSON();
  }

  /**
   * Check whether a vendor has a wallet.
   *
   * This is useful during onboarding flows,
   * migrations, and validation checks.
   *
   * @param vendorId Store/Vendor ID
   */
  static async walletExists(vendorId: string): Promise<boolean> {
    return VendorWalletRepository.exists(vendorId);
  }

  /**
   * Fetch only the vendor's available balance.
   *
   * Useful when a feature only requires a balance
   * and does not need the full wallet object.
   *
   * @param vendorId Store/Vendor ID
   */
  static async getAvailableBalance(vendorId: string): Promise<number> {
    const wallet = await this.getVendorWallet(vendorId);

    return wallet.availableBalance;
  }

  /**
   * Fetch the vendor's total balance.
   *
   * Includes:
   * - Available
   * - Pending
   * - Disputed
   *
   * @param vendorId Store/Vendor ID
   */
  static async getTotalBalance(vendorId: string): Promise<number> {
    const wallet = await this.getVendorWallet(vendorId);

    return wallet.totalBalance;
  }

  /**
   * Determine whether the vendor currently owes
   * the platform any outstanding debt.
   *
   * @param vendorId Store/Vendor ID
   */
  static async hasOutstandingDebt(vendorId: string): Promise<boolean> {
    const wallet = await this.getVendorWallet(vendorId);

    return wallet.hasDebt;
  }

  /**
   * Retrieve the vendor's current debt amount.
   *
   * Returns zero if no debt exists.
   *
   * @param vendorId Store/Vendor ID
   */
  static async getDebtAmount(vendorId: string): Promise<number> {
    const wallet = await this.getVendorWallet(vendorId);

    return wallet.debtAmount;
  }

  static async createVendorWallet(
    vendorId: string,
    session: mongoose.ClientSession | null,
  ): Promise<ReturnType<(typeof VendorWalletRepository)["createWallet"]>> {
    return await VendorWalletRepository.createWallet(vendorId, session);
  }
}
