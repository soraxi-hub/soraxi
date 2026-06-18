import {
  getPlatformWallet,
  creditPlatformCommission,
  creditPlatformPenalty,
} from "@/lib/db/models/platform-wallet.model";
import { IPlatformWalletRepository } from "../interfaces/platform-wallet-repository.interface";
import { PlatformWallet } from "@/domain/platform-wallet/models/platform-wallet";
import { PlatformWalletFactory } from "@/domain/platform-wallet/factories/platform-wallet-factory";
import { AppError } from "@/lib/errors/app-error";
import mongoose from "mongoose";

/**
 * MongoDB implementation of the platform wallet repository.
 * Uses the existing model helper functions.
 */
export class PlatformWalletRepository implements IPlatformWalletRepository {
  async findOrCreate(): Promise<PlatformWallet> {
    let walletDoc = await getPlatformWallet();
    if (!walletDoc) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Failed to retrieve platform wallet",
        { operation: "findOrCreate" },
      );
    }
    return PlatformWalletFactory.fromPersistence(walletDoc);
  }

  async creditCommission(
    amountKobo: number,
    session: mongoose.ClientSession,
  ): Promise<PlatformWallet> {
    const updatedDoc = await creditPlatformCommission(amountKobo, session);
    if (!updatedDoc) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Failed to credit commission to platform wallet",
        { operation: "creditCommission", amountKobo },
      );
    }
    return PlatformWalletFactory.fromPersistence(updatedDoc);
  }

  async creditPenalty(
    amountKobo: number,
    session: mongoose.ClientSession,
  ): Promise<PlatformWallet> {
    const updatedDoc = await creditPlatformPenalty(amountKobo, session);
    if (!updatedDoc) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Failed to credit penalty to platform wallet",
        { operation: "creditPenalty", amountKobo },
      );
    }
    return PlatformWalletFactory.fromPersistence(updatedDoc);
  }
}
