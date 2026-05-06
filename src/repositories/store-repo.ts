import { Store } from "@/domain/stores/store";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import mongoose from "mongoose";

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
      storeOwner: store.ownerId, // Associate store with authenticated user
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
}
