import {
  getPlatformWallet,
  creditPlatformCommission,
  creditPlatformPenalty,
} from "@/lib/db/models/platform-wallet.model";
import { IPlatformWalletRepository } from "../interfaces/platform-wallet-repository.interface";
import { PlatformWallet } from "@/domain/platform-wallet/models/platform-wallet";
import { PlatformWalletFactory } from "@/domain/platform-wallet/factories/platform-wallet-factory";
import { AppError } from "@/lib/errors/app-error";

/**
 * MongoDB implementation of the platform wallet repository.
 * Uses the existing model helper functions.
 */
export class PlatformWalletRepository implements IPlatformWalletRepository {
  async findOrCreate(): Promise<PlatformWallet> {
    let walletDoc = await getPlatformWallet();
    if (!walletDoc) {
      throw new AppError("Failed to retrieve platform wallet", 500);
    }
    return PlatformWalletFactory.fromPersistence(walletDoc);
  }

  async creditCommission(amountKobo: number): Promise<PlatformWallet> {
    const updatedDoc = await creditPlatformCommission(amountKobo);
    if (!updatedDoc) {
      throw new AppError("Failed to credit commission to platform wallet", 500);
    }
    return PlatformWalletFactory.fromPersistence(updatedDoc);
  }

  async creditPenalty(amountKobo: number): Promise<PlatformWallet> {
    const updatedDoc = await creditPlatformPenalty(amountKobo);
    if (!updatedDoc) {
      throw new AppError("Failed to credit penalty to platform wallet", 500);
    }
    return PlatformWalletFactory.fromPersistence(updatedDoc);
  }
}
