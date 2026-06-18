import { IPlatformWallet } from "@/domain/platform-wallet/interfaces/platform-wallet.interface";
import mongoose from "mongoose";

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
    session: mongoose.ClientSession,
  ): Promise<ReturnType<IPlatformWallet["toJSON"]>>;

  /**
   * Credits penalty revenue to the platform.
   * @param amountKobo - Amount in kobo.
   * @returns Updated wallet state.
   */
  creditPenalty(
    amountKobo: number,
    session: mongoose.ClientSession,
  ): Promise<ReturnType<IPlatformWallet["toJSON"]>>;
}
