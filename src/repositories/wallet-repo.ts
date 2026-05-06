import { getStoreModel } from "@/lib/db/models/store.model";
import { getWalletModel } from "@/lib/db/models/wallet.model";
import { AppError } from "@/lib/errors/app-error";
import mongoose from "mongoose";

export class WalletRepository {
  static async createWalletForStore(
    storeId: string,
    session: mongoose.mongo.ClientSession,
  ) {
    // Create Wallet for the new Store
    const Wallet = await getWalletModel();
    const Store = await getStoreModel();
    const existingWallet = await Wallet.findOne({
      storeId: new mongoose.Types.ObjectId(storeId),
    }).session(session);

    if (!existingWallet) {
      const store = await Store.findById(storeId)
        .select("_id walletId")
        .session(session);

      if (!store) throw new AppError("Store not found", 400);

      const wallet = await Wallet.create(
        [
          {
            storeId: new mongoose.Types.ObjectId(storeId),
          },
        ],
        { session },
      );

      // Link the wallet back to the store
      store.walletId = wallet[0]._id as mongoose.Schema.Types.ObjectId;
      await store.save({ session });

      console.log(`Wallet created and linked for store ${store._id}`);
    }
  }
}
