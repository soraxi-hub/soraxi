import { PlatformWallet } from "@/domain/platform-wallet/models/platform-wallet";

export interface IPlatformWalletRepository {
  /**
   * Retrieves the singleton platform wallet. Initialises one if it does not exist.
   * @returns Domain model of the platform wallet.
   */
  findOrCreate(): Promise<PlatformWallet>;

  /**
   * Updates the wallet after credit operations (used internally by credit methods).
   * @param wallet - The updated domain model.
   */
  // update(wallet: PlatformWallet): Promise<PlatformWallet>;

  /**
   * Credits commission revenue to the wallet.
   * @param amountKobo - Amount in kobo to add.
   * @returns Updated domain model.
   */
  creditCommission(amountKobo: number): Promise<PlatformWallet>;

  /**
   * Credits penalty revenue to the wallet.
   * @param amountKobo - Amount in kobo to add.
   * @returns Updated domain model.
   */
  creditPenalty(amountKobo: number): Promise<PlatformWallet>;
}
