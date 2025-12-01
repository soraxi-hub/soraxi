import {
  WalletTransactionType,
  WalletTransactionSource,
  WalletTransactionRelatedDocumentType,
  getWalletTransactionModel,
} from "@/lib/db/models/wallet.model";

export class WalletTransactionService {
  private static WalletTransaction: Awaited<
    ReturnType<typeof getWalletTransactionModel>
  >;

  /**
   * Lazy-load the WalletTransaction model once
   */
  private static async getModel() {
    if (!this.WalletTransaction) {
      this.WalletTransaction = await getWalletTransactionModel();
    }
    return this.WalletTransaction;
  }

  /**
   * Create a wallet transaction entry for audit logging
   */
  static async create(params: {
    walletId: string;
    type: WalletTransactionType;
    amount: number;
    source: WalletTransactionSource;
    relatedDocumentId: string;
    relatedDocumentType?: WalletTransactionRelatedDocumentType; // optional override
    description: string;
  }) {
    const Model = await this.getModel();

    return Model.create({
      walletId: params.walletId,
      type: params.type,
      amount: params.amount,
      source: params.source,
      relatedDocumentType:
        params.relatedDocumentType ??
        WalletTransactionRelatedDocumentType.Adjustment, // default fallback
      relatedDocumentId: params.relatedDocumentId,
      description: params.description,
    });
  }
}
