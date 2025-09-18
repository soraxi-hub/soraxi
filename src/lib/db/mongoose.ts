import mongoose from "mongoose";

// Connection state management
interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  connection: typeof mongoose | null;
}

const connection: ConnectionState = {
  isConnected: false,
  isConnecting: false,
  connection: null,
};

// Connection options for production-ready setup
const connectionOptions = {
  bufferCommands: false, // Disable mongoose buffering
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
};

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  // Check if we have a valid connection URI
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }

  // Return existing connection if already connected
  if (connection.isConnected && connection.connection) {
    console.log("Using existing MongoDB connection");
    return connection.connection;
  }

  // Prevent multiple simultaneous connection attempts
  if (connection.isConnecting) {
    console.log("MongoDB connection already in progress, waiting...");
    // Wait for the connection to complete
    while (connection.isConnecting) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (connection.isConnected && connection.connection) {
      return connection.connection;
    }
  }

  try {
    connection.isConnecting = true;

    // Set mongoose configuration
    mongoose.set("strictQuery", true);

    // Add connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB connected successfully");
      connection.isConnected = true;
      connection.isConnecting = false;
    });

    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error);
      connection.isConnected = false;
      connection.isConnecting = false;
      connection.connection = null;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
      connection.isConnected = false;
      connection.connection = null;
    });

    // Attempt connection
    console.log("🔄 Connecting to MongoDB...");
    const mongooseInstance = await mongoose.connect(
      process.env.MONGODB_URI,
      connectionOptions
    );

    connection.connection = mongooseInstance;
    connection.isConnected = true;
    connection.isConnecting = false;

    return mongooseInstance;
  } catch (error) {
    connection.isConnecting = false;
    connection.isConnected = false;
    connection.connection = null;

    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  }
};

// Utility function to check connection status
export const isMongoConnected = (): boolean => {
  return connection.isConnected && mongoose.connection.readyState === 1;
};

// Graceful shutdown
export const disconnectFromDatabase = async (): Promise<void> => {
  if (connection.isConnected) {
    await mongoose.disconnect();
    connection.isConnected = false;
    connection.connection = null;
    console.log("🔌 Disconnected from MongoDB");
  }
};

// import mongoose from "mongoose";
// import { getUserModel } from "./models/user.model";
// import { getStoreModel } from "./models/store.model";
// import { getProductModel } from "./models/product.model";
// import { getAdminModel } from "./models/admin.model";
// import { getWishlistModel } from "./models/wishlist.model";
// import {
//   getWalletModel,
//   getWalletTransactionModel,
// } from "./models/wallet.model";
// import { getAuditLogModel } from "./models/audit-log.model";
// import { getCartModel } from "./models/cart.model";
// import { getOrderModel } from "./models/order.model";

// let isConnected = false; // variable to check connection status;

// export const connectToDatabase = async () => {
//   mongoose.set("strictQuery", true);

//   if (!process.env.MONGODB_URI) return console.log("MONGODB_URL NOT FOUND");

//   if (isConnected) return console.log("Already connected to MongoDB");

//   try {
//     await mongoose.connect(process.env.MONGODB_URI);
//     isConnected = true;
//     console.log("Connected to MongoDB");
//     await getUserModel();
//     await getStoreModel();
//     await getProductModel();
//     await getAdminModel();
//     await getWishlistModel();
//     await getWalletModel();
//     await getWalletTransactionModel();
//     await getAuditLogModel();
//     await getCartModel();
//     await getOrderModel();
//   } catch (error) {
//     console.log(error);
//   }
// };
