import mongoose from "mongoose";

import {
  createVendorWallet,
  getVendorWalletModel,
  IVendorWallet,
  IVendorWalletDocument,
} from "@/lib/db/models/vendor-wallet.model";

import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";

export class VendorWalletRepository {
  /**
   * Create a wallet for a vendor/store.
   */
  static async createWallet(
    vendorId: string,
    session: mongoose.ClientSession | null,
  ): Promise<IVendorWallet> {
    return createVendorWallet(vendorId, session);
  }

  /**
   * Find wallet by vendor/store id.
   */
  static async findByVendorId(vendorId: string): Promise<IVendorWallet | null> {
    const WalletModel = await getVendorWalletModel();

    return await QueryBuilderFactory.queryBuilder<
      IVendorWallet,
      IVendorWalletDocument
    >(WalletModel)
      .where("vendorId", new mongoose.Types.ObjectId(vendorId))
      .executeOne();
  }

  /**
   * Find wallet by wallet id.
   */
  static async findById(walletId: string): Promise<IVendorWallet | null> {
    const WalletModel = await getVendorWalletModel();

    return await QueryBuilderFactory.queryBuilder<
      IVendorWallet,
      IVendorWalletDocument
    >(WalletModel)
      .where("_id", new mongoose.Types.ObjectId(walletId))
      .executeOne();
  }

  /**
   * Check whether a wallet exists.
   */
  static async exists(vendorId: string): Promise<boolean> {
    const WalletModel = await getVendorWalletModel();

    const wallet = await WalletModel.exists({
      vendorId: new mongoose.Types.ObjectId(vendorId),
    });

    return !!wallet;
  }

  /**
   * Get only balances.
   */
  static async getBalances(
    vendorId: string,
  ): Promise<IVendorWallet["balances"] | null> {
    const WalletModel = await getVendorWalletModel();

    const wallet = await WalletModel.findOne({
      vendorId: new mongoose.Types.ObjectId(vendorId),
    }).select("balances");

    return wallet?.balances ?? null;
  }

  /**
   * Get only debt information.
   */
  static async getDebtInfo(
    vendorId: string,
  ): Promise<IVendorWallet["debt"] | null> {
    const WalletModel = await getVendorWalletModel();

    const wallet = await WalletModel.findOne({
      vendorId: new mongoose.Types.ObjectId(vendorId),
    }).select("debt");

    return wallet?.debt ?? null;
  }

  /**
   * Link wallet to store after creation.
   */
  static async attachWalletToStore(
    storeId: string,
    walletId: string,
    session?: mongoose.ClientSession,
  ): Promise<void> {
    const Store = await (
      await import("@/lib/db/models/store.model")
    ).getStoreModel();

    await Store.updateOne(
      {
        _id: new mongoose.Types.ObjectId(storeId),
      },
      {
        $set: {
          walletId: new mongoose.Types.ObjectId(walletId),
        },
      },
      {
        session,
      },
    );
  }
}
