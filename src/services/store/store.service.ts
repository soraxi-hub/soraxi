import { BuildStoreInput, StoreFactory } from "@/domain/stores/store-factory";
import { getStoreModel } from "@/lib/db/models/store.model";
import { AppError } from "@/lib/errors/app-error";
import { PasswordService } from "@/lib/utils";
import { StoreRepository } from "@/repositories/store-repo";
import { UserRepository } from "@/repositories/user-repo";
import { WalletRepository } from "@/repositories/wallet-repo";
import mongoose from "mongoose";

export class StoreService {
  static async createStore(data: BuildStoreInput) {
    const { ownerId } = data;

    // Check if user already has a store
    const existingUserStore = await UserRepository.hasStore(ownerId);
    if (existingUserStore)
      throw new AppError("Cannot create multiple stores", 400);

    // Check if store email already exists
    const normalizedEmail = data.storeEmail.toLowerCase().trim();
    const existingStoreEmail =
      await StoreRepository.isExistingStoreEmail(normalizedEmail);
    if (existingStoreEmail)
      throw new AppError("Store email already exists", 400);

    // Check if store name already exists (case-insensitive)
    const existingStoreName = await StoreRepository.isExistingstoreName(
      data.storeName,
    );
    if (existingStoreName) throw new AppError("Store name already exists", 400);

    const uniqueId = await StoreService.generateUniqueStoreId(data.storeName);
    const hashedPassword = await PasswordService.hashPassword(data.password);

    // Create the clean Store object
    const store = StoreFactory.build({
      ...data,
      password: hashedPassword,
      uniqueId,
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Repository: Save it
      const savedStore = await StoreRepository.saveStoreToDB(store, session);

      // Side Effects: Create Wallet
      await WalletRepository.createWalletForStore(
        savedStore._id.toString(),
        session,
      );

      // Update user store array
      await UserRepository.updateUserStoreArray(
        ownerId,
        savedStore._id.toString(),
        session,
      );

      await session.commitTransaction();
      session.endSession();

      return savedStore;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  /**
   * Generate a unique store ID based on the store name
   * Ensures uniqueness by appending numbers if needed
   */
  static async generateUniqueStoreId(storeName: string): Promise<string> {
    const StoreModel = await getStoreModel();

    // Create base ID from store name (lowercase, replace spaces/special chars with hyphens)
    let baseId = storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s\-_]/g, "") // Remove special characters except spaces, hyphens, underscores
      .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

    // Ensure minimum length
    if (baseId.length < 3) {
      baseId = `store-${baseId}`;
    }

    let uniqueId = baseId;
    let counter = 1;

    // Check for uniqueness and append number if needed
    while (await StoreModel.findOne({ uniqueId })) {
      uniqueId = `${baseId}-${counter}`;
      counter++;

      // Prevent infinite loop
      if (counter > 1000) {
        uniqueId = `${baseId}-${Date.now()}`;
        break;
      }
    }

    return uniqueId;
  }
}
