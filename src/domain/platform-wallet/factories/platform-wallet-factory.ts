import { PlatformWallet, PlatformWalletProps } from "../models/platform-wallet";

/**
 * Factory for creating PlatformWallet domain objects from various sources.
 */
export class PlatformWalletFactory {
  /**
   * Creates a domain model from a plain object (e.g., Mongoose lean document).
   * @param data - Raw persistence data containing id, balances, currency, timestamps.
   */
  static fromPersistence(data: {
    _id: { toString(): string };
    balances: { commission: number; penalties: number; total: number };
    currency: string;
    createdAt: Date;
    updatedAt: Date;
  }): PlatformWallet {
    const props: PlatformWalletProps = {
      id: data._id.toString(),
      balances: {
        commission: data.balances.commission,
        penalties: data.balances.penalties,
        total: data.balances.total,
      },
      currency: data.currency,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    return new PlatformWallet(props);
  }

  /**
   * Prepares a plain object suitable for database update operations.
   * @param wallet - Domain model instance.
   */
  static toPersistence(
    wallet: PlatformWallet,
  ): Omit<PlatformWalletProps, "id"> {
    return {
      balances: { ...wallet.balances },
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}
