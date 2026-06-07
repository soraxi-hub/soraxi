import { IPlatformWallet } from "@/domain/platform-wallet/interfaces/platform-wallet.interface";

export interface IPlatformWalletService {
  /**
   * Retrieves the current platform wallet state.
   * @returns The wallet domain object as plain JSON.
   */
  getWallet(): Promise<ReturnType<IPlatformWallet["toJSON"]>>;

  /**
   * Credits commission revenue to the platform.
   * @param amountKobo - Amount in kobo.
   * @returns Updated wallet state.
   */
  creditCommission(
    amountKobo: number,
  ): Promise<ReturnType<IPlatformWallet["toJSON"]>>;

  /**
   * Credits penalty revenue to the platform.
   * @param amountKobo - Amount in kobo.
   * @returns Updated wallet state.
   */
  creditPenalty(
    amountKobo: number,
  ): Promise<ReturnType<IPlatformWallet["toJSON"]>>;
}
