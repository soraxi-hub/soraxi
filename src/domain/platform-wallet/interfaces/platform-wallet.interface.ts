/**
 * Platform wallet balances expressed in the smallest currency unit (kobo).
 */
export interface IWalletBalances {
  /** Total commission revenue earned from orders (in kobo). */
  commission: number;
  /** Total penalty revenue collected from stores (in kobo). */
  penalties: number;
  /** Total revenue = commission + penalties (in kobo). */
  total: number;
}

/**
 * Domain contract for the Platform Wallet aggregate.
 */
export interface IPlatformWallet {
  /** Unique identifier (MongoDB ObjectId as string). */
  readonly id: string;
  /** Wallet balances in kobo. */
  readonly balances: IWalletBalances;
  /** Currency code, e.g., "NGN". */
  readonly currency: string;
  /** Timestamp of first creation. */
  readonly createdAt: Date;
  /** Timestamp of last update. */
  readonly updatedAt: Date;

  /**
   * Converts the domain aggregate to a plain JSON object suitable for API responses.
   * Balances are converted from kobo to Naira for human readability.
   */
  toJSON(): {
    id: string;
    balances: {
      commission: number; // in Naira
      penalties: number; // in Naira
      total: number; // in Naira
    };
    currency: string;
    createdAt: Date;
    updatedAt: Date;
  };
}
