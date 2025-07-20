import mongoose from "mongoose";
import { getUserModel } from "./models/user.model";
import { getStoreModel } from "./models/store.model";
import { getProductModel } from "./models/product.model";
import { getAdminModel } from "./models/admin.model";
import { getWishlistModel } from "./models/wishlist.model";
import {
  getWalletModel,
  getWalletTransactionModel,
} from "./models/wallet.model";
import { getAuditLogModel } from "./models/audit-log.model";
import { getCartModel } from "./models/cart.model";
import { getOrderModel } from "./models/order.model";

let isConnected = false; // variable to check connection status;

export const connectToDatabase = async () => {
  mongoose.set("strictQuery", true);

  if (!process.env.MONGODB_URI) return console.log("MONGODB_URL NOT FOUND");

  if (isConnected) return console.log("Already connected to MongoDB");

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("Connected to MongoDB");
    await getUserModel();
    await getStoreModel();
    await getProductModel();
    await getAdminModel();
    await getWishlistModel();
    await getWalletModel();
    await getWalletTransactionModel();
    await getAuditLogModel();
    await getCartModel();
    await getOrderModel();
  } catch (error) {
    console.log(error);
  }
};
