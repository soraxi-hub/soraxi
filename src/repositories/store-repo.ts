import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { Store } from "@/domain/stores/store";
import {
  getStoreModel,
  IStore,
  IStoreDocument,
} from "@/lib/db/models/store.model";
import { AppError } from "@/lib/errors/app-error";
import mongoose, { ClientSession } from "mongoose";

export class StoreRepository {
  // Create a store in the database
  static async saveStoreToDB(
    store: Store,
    session: mongoose.mongo.ClientSession,
  ) {
    const StoreModel = await getStoreModel();

    const newStore = new StoreModel({
      name: store.storeName,
      storeEmail: store.email,
      password: store.password,
      storeOwner: store.ownerId,
      uniqueId: store.uniqueId,
    });

    const createdStore = await newStore.save({ session });
    return createdStore.toObject();
  }

  // Fetches a store from the database using the store email
  static async findStoreByEmail(email: string): Promise<IStore | null> {
    const Store = await getStoreModel();

    const store = await Store.findOne({
      storeEmail: email.toLowerCase().trim(),
    })
      .select(
        "name storeEmail password status verification businessInfo shippingMethods payoutAccounts agreedToTermsAt description storeOwner",
      )
      .lean<IStore>();

    return store;
  }

  // Check if a store with this email exists in the database
  static async isExistingStoreEmail(email: string): Promise<boolean> {
    const StoreModel = await getStoreModel();
    const store = await StoreModel.findOne({
      storeEmail: email.toLowerCase(),
    })
      .select("_id")
      .lean<IStore>();
    return store !== null;
  }

  // Check if a store with this name exists in the database
  static async isExistingstoreName(name: string): Promise<boolean> {
    const StoreModel = await getStoreModel();
    const store = await StoreModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    })
      .select("_id")
      .lean<IStore>();
    return store !== null;
  }

  static async findStoreById(id: string) {
    const StoreModel = await getStoreModel();

    return await QueryBuilderFactory.queryBuilder<IStore>(StoreModel)
      .where("_id", new mongoose.Types.ObjectId(id))
      .executeOne();
  }

  static async linkVendorWalletToStore(
    vendorWalletId: string,
    storeId: string,
    session: mongoose.ClientSession,
  ): Promise<void> {
    const StoreModel = await getStoreModel();

    const store = await QueryBuilderFactory.queryBuilder<
      IStore,
      IStoreDocument
    >(StoreModel)
      .where("_id", new mongoose.Types.ObjectId(storeId))
      .withMongoDBsession(session as ClientSession)
      .withLean(false)
      .executeOne();

    if (!store) throw new AppError("NOT_FOUND", "Store not found");

    store.walletId = new mongoose.Types.ObjectId(
      vendorWalletId,
    ) as unknown as mongoose.Schema.Types.ObjectId;

    await store.save({ session });
  }

  static async persistUpdatedPassword(
    store: Store,
  ): Promise<IStoreDocument | null> {
    const StoreModel = await getStoreModel();

    const doc = await StoreModel.findByIdAndUpdate(
      store.storeId,
      {
        password: store.password,
        $set: {
          "security.hasChangedDefaultPassword": true,
          "security.passwordChangedAt": new Date(),
        },
      },
      { new: true },
    );

    return doc;
  }
}
