import { IPlatformWalletService } from "../interfaces/platform-wallet-service.interface";
import { IPlatformWalletRepository } from "@/repositories/interfaces/platform-wallet-repository.interface";
import { AppError } from "@/lib/errors/app-error";
import mongoose from "mongoose";

/**
 * Service for platform wallet business logic.
 * Uses the repository to access data and returns transformed domain objects.
 */
export class PlatformWalletService implements IPlatformWalletService {
  constructor(private readonly walletRepository: IPlatformWalletRepository) {}

  async getWallet() {
    const wallet = await this.walletRepository.findOrCreate();
    return wallet.toJSON();
  }

  async creditCommission(amountKobo: number, session: mongoose.ClientSession) {
    if (amountKobo <= 0) {
      throw new AppError(
        "BAD_REQUEST",
        "Commission amount must be greater than zero",
        { amountKobo },
      );
    }
    const updatedWallet = await this.walletRepository.creditCommission(
      amountKobo,
      session,
    );
    return updatedWallet.toJSON();
  }

  async creditPenalty(amountKobo: number, session: mongoose.ClientSession) {
    if (amountKobo <= 0) {
      throw new AppError(
        "BAD_REQUEST",
        "Penalty amount must be greater than zero",
        { amountKobo },
      );
    }
    const updatedWallet = await this.walletRepository.creditPenalty(
      amountKobo,
      session,
    );
    return updatedWallet.toJSON();
  }
}
