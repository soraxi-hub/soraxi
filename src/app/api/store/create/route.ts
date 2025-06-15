import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getUserDataFromToken } from "@/lib/helpers/getUserDataFromToken";
import { AppError } from "@/lib/errors/app-error";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel } from "@/lib/db/models/user.model";
import { handleApiError } from "@/lib/utils/handle-api-error";

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
    const hashedPassword = await bcrypt.hash(password, 12);

    // TODO: review this logic from top to bottom

    // Create the new store with pending status
    const newStore = new Store({
      name: storeName.trim(),
      storeEmail: storeEmail.toLowerCase().trim(),
      password: hashedPassword,
      storeOwner: userData.id, // ✅ Associate store with authenticated user
      uniqueId,
      status: "pending", // ✅ Set initial status to pending
      verification: {
        isVerified: false, // ✅ Not verified initially
        method: "email",
      },
      // Initialize empty arrays and default values
      followers: [],
      physicalProducts: [],
      digitalProducts: [],
      shippingMethods: [],
      payoutAccounts: [],
      payoutHistory: [],
      availableBalance: 0,
      pendingBalance: 0,
      platformFee: 0,
      transactionFees: 0,
      totalEarnings: 0,
      ratings: {
        averageRating: 0,
        reviewCount: 0,
        complaintCount: 0,
      },
    });

    // Save the store to database
    const savedStore = await newStore.save();

    // Update the user's stores array
    const User = await getUserModel();
    await User.findByIdAndUpdate(userData.id, {
      $push: { stores: { storeId: savedStore._id } },
    });

    // Return success response with store information
    return NextResponse.json(
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
  } catch (error) {
    console.error("Error creating store:", error);

    return handleApiError(error);

    // Handle MongoDB duplicate key errors
    // if (error instanceof Error && error.message.includes("duplicate key")) {
    //   if (error.message.includes("storeEmail")) {
    //     return NextResponse.json(
    //       { error: "Store email already exists" },
    //       { status: 400 }
    //     );
    //   }
    //   if (error.message.includes("uniqueId")) {
    //     return NextResponse.json(
    //       { error: "Store name already exists" },
    //       { status: 400 }
    //     );
    //   }
    // }

    // return NextResponse.json(
    //   { error: "Internal server error. Please try again." },
    //   { status: 500 }
    // );
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
