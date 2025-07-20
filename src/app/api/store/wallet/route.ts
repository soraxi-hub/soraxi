import { type NextRequest, NextResponse } from "next/server";
import { getWalletModel } from "@/lib/db/models/wallet.model";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

/**
 * Store Wallet API Route
 *
 * Handles wallet data retrieval and management for authenticated stores.
 * Provides secure access to wallet balance, pending amounts, and earnings
 * with comprehensive error handling and validation.
 *
 * Endpoints:
 * - GET: Retrieve wallet information for authenticated store
 * - POST: Create wallet for new store (if needed)
 *
 * Security:
 * - Store session validation required
 * - Wallet ownership verification
 * - Input sanitization and validation
 */

/**
 * GET /api/store/wallet
 *
 * Retrieves wallet information for the authenticated store.
 * Returns balance, pending amounts, total earnings, and metadata.
 *
 * @param request - Next.js request object
 * @returns Wallet data or error response
 */
export async function GET(request: NextRequest) {
  try {
    // Validate store session
    const storeSession = await getStoreFromCookie();
    if (!storeSession?.id || !request) {
      return NextResponse.json(
        { error: "Unauthorized - Store session required" },
        { status: 401 }
      );
    }

    // Get wallet model
    const Wallet = await getWalletModel();

    // Find wallet for the authenticated store
    const wallet = await Wallet.findOne({ store: storeSession.id })
      .select("store balance pending totalEarned currency createdAt updatedAt")
      .lean();

    // Handle case where wallet doesn't exist
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found for this store" },
        { status: 404 }
      );
    }

    // Format wallet data for client
    const formattedWallet = {
      _id: wallet._id.toString(),
      store: wallet.store.toString(),
      balance: wallet.balance || 0,
      pending: wallet.pending || 0,
      totalEarned: wallet.totalEarned || 0,
      currency: wallet.currency || "NGN",
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };

    return NextResponse.json({
      success: true,
      wallet: formattedWallet,
    });
  } catch (error) {
    console.error("Error fetching wallet data:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/store/wallet
 *
 * Creates a new wallet for the authenticated store.
 * Used during store onboarding or wallet initialization.
 *
 * @param request - Next.js request object with wallet creation data
 * @returns Created wallet data or error response
 */
export async function POST(request: NextRequest) {
  try {
    // Validate store session
    const storeSession = await getStoreFromCookie();
    if (!storeSession?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Store session required" },
        { status: 401 }
      );
    }

    // Get wallet model
    const Wallet = await getWalletModel();

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({ store: storeSession.id });
    if (existingWallet) {
      return NextResponse.json(
        { error: "Wallet already exists for this store" },
        { status: 409 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { currency = "NGN" } = body;

    // Create new wallet
    const newWallet = new Wallet({
      store: storeSession.id,
      balance: 0,
      pending: 0,
      totalEarned: 0,
      currency,
    });

    const savedWallet = (await newWallet.save()) as {
      _id: { toString: () => string };
      store: { toString: () => string };
      balance: number;
      pending: number;
      totalEarned: number;
      currency: string;
      createdAt: Date;
      updatedAt: Date;
    };

    // Format response
    const formattedWallet = {
      _id: savedWallet._id.toString(),
      store: savedWallet.store.toString(),
      balance: savedWallet.balance,
      pending: savedWallet.pending,
      totalEarned: savedWallet.totalEarned,
      currency: savedWallet.currency,
      createdAt: savedWallet.createdAt,
      updatedAt: savedWallet.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Wallet created successfully",
        wallet: formattedWallet,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating wallet:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
