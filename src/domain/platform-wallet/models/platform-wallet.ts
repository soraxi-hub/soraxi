import {
  IPlatformWallet,
  IWalletBalances,
} from "../interfaces/platform-wallet.interface";
import { koboToNaira } from "@/lib/utils/naira";

export interface PlatformWalletProps {
  id: string;
  balances: IWalletBalances;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rich domain model for the Platform Wallet.
 * All amounts are stored and manipulated in kobo (smallest unit).
 */
export class PlatformWallet implements IPlatformWallet {
  constructor(private readonly props: PlatformWalletProps) {}

  get id(): string {
    return this.props.id;
  }

  get balances(): IWalletBalances {
    return { ...this.props.balances };
  }

  get currency(): string {
    return this.props.currency;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Converts internal kobo values to Naira for external consumption.
   */
  toJSON() {
    return {
      id: this.id,
      balances: {
        commission: koboToNaira(this.balances.commission),
        penalties: koboToNaira(this.balances.penalties),
        total: koboToNaira(this.balances.total),
      },
      currency: this.currency,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Factory method to create a new wallet with zero balances.
   */
  static empty(id: string, currency: string = "NGN"): PlatformWallet {
    const now = new Date();
    return new PlatformWallet({
      id,
      balances: { commission: 0, penalties: 0, total: 0 },
      currency,
      createdAt: now,
      updatedAt: now,
    });
  }
}
