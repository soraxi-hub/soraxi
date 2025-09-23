import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  getStoreModel,
  StoreStatus,
  StoreVerificationStatus,
} from "@/lib/db/models/store.model";
import { getWalletModel } from "@/lib/db/models/wallet.model";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel } from "@/lib/db/models/user.model";
import { handleApiError } from "@/lib/utils/handle-api-error";
import mongoose from "mongoose";
import { StoreTokenPayload } from "@/lib/helpers/get-store-data-from-token";
import jwt from "jsonwebtoken";

/**
 * API Route: Create New Store
 * Creates a new store with pending status for the authenticated user
 * Generates unique store ID and hashes password for security
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    // Check authentication - user must be logged in to create a store
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      throw new AppError("Unauthorized - Please sign in first", 401);
    }

    const body = await request.json();
    const { storeName, storeEmail, password } = body;

    // Validate required fields
    if (!storeName || !storeEmail || !password) {
      throw new AppError("Store name, email, and password are required", 400);
    }

    // Validate store name format
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(storeName)) {
      throw new AppError(
        `Store name can only contain letters, numbers, spaces, hyphens, and underscores`,
        400
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(storeEmail)) {
      throw new AppError("Please enter a valid email address", 400);
    }

    // Validate password strength
    if (password.length < 8) {
      throw new AppError("Password must be at least 8 characters long", 400);
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new AppError(
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        400
      );
    }

    // Get store model
    const Store = await getStoreModel();
    const User = await getUserModel();

    // Check if user already has a store
    const existingUserStore = await User.findById(userData.id).select("stores");

    if (
      existingUserStore &&
      Array.isArray(existingUserStore.stores) &&
      existingUserStore.stores.length > 0
    ) {
      throw new AppError("Cannot create multiple stores", 400);
    }

    // Check if store email already exists
    const existingStoreEmail = await Store.findOne({
      storeEmail: storeEmail.toLowerCase(),
    });
    if (existingStoreEmail) {
      throw new AppError("Store email already exists", 400);
    }

    // Check if store name already exists (case-insensitive)
    const existingStoreName = await Store.findOne({
      name: { $regex: new RegExp(`^${storeName}$`, "i") },
    });
    if (existingStoreName) {
      throw new AppError("Store name already exists", 400);
    }

    // Generate unique store ID
    const uniqueId = await generateUniqueStoreId(storeName);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new store with pending status
    const newStore = new Store({
      name: storeName.trim(),
      storeEmail: storeEmail.toLowerCase().trim(),
      password: hashedPassword,
      storeOwner: userData.id, // ✅ Associate store with authenticated user
      uniqueId,
      status: StoreStatus.Pending, // ✅ Set initial status to pending
      verification: {
        isVerified: false, // ✅ Not verified initially
        method: StoreVerificationStatus.Email,
      },
      // Initialize empty arrays and default values
      followers: [],
      physicalProducts: [],
      shippingMethods: [],
      payoutAccounts: [],
      ratings: {
        averageRating: 0,
        reviewCount: 0,
        complaintCount: 0,
      },
    });

    // Save the store to database
    const savedStore = await newStore.save();

    // Create Wallet for the new Store
    const Wallet = await getWalletModel();
    const existingWallet = await Wallet.findOne({ storeId: savedStore._id });

    if (!existingWallet) {
      const wallet = await Wallet.create({
        storeId: savedStore._id,
        balance: 0,
        pending: 0,
        totalEarned: 0,
        currency: "NGN",
      });

      // Link the wallet back to the store
      savedStore.walletId = wallet._id as mongoose.Schema.Types.ObjectId;
      await savedStore.save();

      console.log(`Wallet created and linked for store ${savedStore._id}`);
    }

    // Update the user's stores array
    await User.findByIdAndUpdate(userData.id, {
      $push: { stores: { storeId: savedStore._id } },
    });

    // Build token payload
    const tokenData: StoreTokenPayload = {
      id: savedStore._id.toString(),
      name: savedStore.name,
      storeEmail: savedStore.storeEmail,
      status: savedStore.status,
    };

    // One Week in seconds
    const oneWeekInSeconds = 7 * 24 * 60 * 60;

    // Two Weeks in seconds
    const twoWeeksInSeconds = 2 * oneWeekInSeconds;

    // Sign JWT
    const token = jwt.sign(tokenData, process.env.JWT_SECRET_KEY!, {
      expiresIn: oneWeekInSeconds,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Store created successfully",
        store: {
          id: savedStore._id,
          name: savedStore.name,
          storeEmail: savedStore.storeEmail,
          uniqueId: savedStore.uniqueId,
          status: savedStore.status,
          verification: savedStore.verification,
          createdAt: savedStore.createdAt,
        },
      },
      { status: 201 }
    );

    const hostname = request.nextUrl.hostname;

    // Set the token in an HTTP-only cookie
    response.cookies.set("store", token, {
      httpOnly: true,
      maxAge: oneWeekInSeconds,
      path: "/", // optional
      secure: process.env.NODE_ENV === "production", // secure only in production
      sameSite: "lax",
      domain: hostname.endsWith("soraxihub.com") ? ".soraxihub.com" : undefined,
    });

    // Optional: reissue userToken with storeId
    const userPayload = {
      id: userData.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      store: savedStore._id.toString(),
    };

    const newUserToken = jwt.sign(userPayload, process.env.JWT_SECRET_KEY!, {
      expiresIn: twoWeeksInSeconds,
    });

    response.cookies.set("user", newUserToken, {
      httpOnly: true,
      maxAge: twoWeeksInSeconds,
      path: "/", // optional
      secure: process.env.NODE_ENV === "production", // secure only in production
      sameSite: "lax",
      domain: hostname.endsWith("soraxihub.com") ? ".soraxihub.com" : undefined,
    });

    // Return success response with store information
    return response;
  } catch (error) {
    console.error("Error creating store:", error);

    return handleApiError(error);
  }
}

/**
 * Generate a unique store ID based on the store name
 * Ensures uniqueness by appending numbers if needed
 */
async function generateUniqueStoreId(storeName: string): Promise<string> {
  const Store = await getStoreModel();

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
  while (await Store.findOne({ uniqueId })) {
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
