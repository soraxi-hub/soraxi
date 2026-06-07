import { IPlatformWalletService } from "../interfaces/platform-wallet-service.interface";
import { IPlatformWalletRepository } from "@/repositories/interfaces/platform-wallet-repository.interface";
import { AppError } from "@/lib/errors/app-error";

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

  async creditCommission(amountKobo: number) {
    if (amountKobo <= 0) {
      throw new AppError("Commission amount must be greater than zero", 400);
    }
    const updatedWallet =
      await this.walletRepository.creditCommission(amountKobo);
    return updatedWallet.toJSON();
  }

  async creditPenalty(amountKobo: number) {
    if (amountKobo <= 0) {
      throw new AppError("Penalty amount must be greater than zero", 400);
    }
    const updatedWallet = await this.walletRepository.creditPenalty(amountKobo);
    return updatedWallet.toJSON();
  }
}
